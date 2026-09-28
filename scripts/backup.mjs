// Downloads a copy of the Supabase project into backups/<date>/: every table exposed by the API (JSON),
// the auth users list and all Storage files. The schema itself lives in supabase/migrations.
// Usage: npm run backup   (reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env)
import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: KEY } = process.env;
if (!SUPABASE_URL || !KEY) {
  console.error('Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false } });
const out = join('backups', new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-'));
const PAGE = 1000;

async function save(path, data) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, typeof data === 'string' || data instanceof Uint8Array ? data : JSON.stringify(data, null, 2));
}

async function listTables() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Accept: 'application/openapi+json' } });
  if (!res.ok) throw new Error(`No se pudo leer la lista de tablas (${res.status})`);
  return Object.keys((await res.json()).definitions ?? {}).sort();
}

async function dumpTable(table) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.from(table).select('*').range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  await save(join(out, 'db', `${table}.json`), rows);
  return rows.length;
}

async function dumpUsers() {
  const users = [];
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: PAGE });
    if (error) throw new Error(`usuarios: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < PAGE) break;
  }
  await save(join(out, 'auth-users.json'), users);
  return users.length;
}

async function listFiles(bucket, prefix = '') {
  const files = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await db.storage.from(bucket).list(prefix, { limit: PAGE, offset });
    if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`);
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      // Folders come back without an id.
      if (entry.id) files.push(path);
      else files.push(...(await listFiles(bucket, path)));
    }
    if (data.length < PAGE) break;
  }
  return files;
}

async function dumpBucket(bucket) {
  const files = await listFiles(bucket);
  for (const path of files) {
    const { data, error } = await db.storage.from(bucket).download(path);
    if (error) throw new Error(`${bucket}/${path}: ${error.message}`);
    await save(join(out, 'storage', bucket, path), new Uint8Array(await data.arrayBuffer()));
  }
  return files.length;
}

console.log(`Respaldando en ${out}/ …`);
for (const table of await listTables()) console.log(`  tabla ${table}: ${await dumpTable(table)} filas`);
console.log(`  usuarios: ${await dumpUsers()}`);
const { data: buckets, error } = await db.storage.listBuckets();
if (error) throw new Error(`buckets: ${error.message}`);
for (const { id } of buckets) console.log(`  fotos ${id}: ${await dumpBucket(id)} archivos`);
console.log('Listo ✅');
