// Demo data: an admin, an owner with two activated PetIDs (one pet lost), unactivated PetIDs, scans and a found report.
// Usage: npm run seed   (reads SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and optional ADMIN_EMAIL from .env)
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en .env');
  process.exit(1);
}

const OWNER = { email: 'demo@petid.app', password: 'PetID-demo-2026', name: 'Sol Demo', phone: '+56912345678' };
const ADMIN = { email: 'admin@petid.app', password: 'PetID-admin-2026', name: 'Admin PetID', phone: '+56900000000' };
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const ago = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString();
const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';
const DESKTOP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15';
const ipLocation = (city, lat, lng) => ({
  location_source: 'ip',
  city,
  region: 'Santiago Metropolitan',
  country: 'CL',
  approximate_latitude: lat,
  approximate_longitude: lng,
});

function check({ data, error }) {
  if (error) throw error;
  return data;
}

async function getOrCreateUser(user, allUsers) {
  const existing = allUsers.find((u) => u.email === user.email);
  if (existing) return existing.id;

  const data = check(
    await db.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { name: user.name, phone: user.phone },
    }),
  );
  return data.user.id;
}

async function main() {
  const { users } = check(await db.auth.admin.listUsers({ perPage: 1000 }));
  const ownerId = await getOrCreateUser(OWNER, users);
  const adminId = await getOrCreateUser(ADMIN, users);

  check(await db.from('profiles').update({ role: 'admin' }).eq('id', adminId));
  if (ADMIN_EMAIL) {
    const promoted = check(await db.from('profiles').update({ role: 'admin' }).eq('email', ADMIN_EMAIL).select('id'));
    if (!promoted.length) console.warn(`⚠ ADMIN_EMAIL=${ADMIN_EMAIL} no tiene cuenta todavía: regístrate y vuelve a correr el seed.`);
  }

  // Idempotent: deleting the demo pets cascades to contacts/reports and frees their PetIDs;
  // deleting the demo PetIDs cascades to their scans.
  check(await db.from('pets').delete().eq('owner_id', ownerId));
  check(await db.from('pet_ids').delete().like('qr_token', 'demo-%'));

  const pets = check(
    await db
      .from('pets')
      .insert([
        {
          owner_id: ownerId,
          name: 'Max',
          species: 'dog',
          breed: 'Labrador',
          sex: 'male',
          birth_date: '2021-03-14',
          color: 'Dorado',
          weight: 29.5,
          photo_url: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=900&q=80',
          description: 'Muy amistoso y juguetón. Responde a su nombre y le encantan las pelotas.',
          allergies: 'Pollo',
          special_needs: 'Le asustan los fuegos artificiales.',
        },
        {
          owner_id: ownerId,
          name: 'Luna',
          species: 'cat',
          breed: 'Mestiza',
          sex: 'female',
          birth_date: '2019-08-02',
          color: 'Gris atigrado',
          weight: 4.2,
          photo_url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=900&q=80',
          description: 'Tímida con desconocidos. Tiene una mancha blanca en el pecho.',
          medications: 'Tiroides: media pastilla cada mañana.',
          is_lost: true,
        },
      ])
      .select('id, name'),
  );
  const max = pets.find((p) => p.name === 'Max');
  const luna = pets.find((p) => p.name === 'Luna');

  const activated = (petId, days) => ({
    status: 'activated',
    owner_id: ownerId,
    pet_id: petId,
    sold_at: ago(60 * 24 * (days + 2)),
    activated_at: ago(60 * 24 * days),
  });
  const tags = check(
    await db
      .from('pet_ids')
      .insert([
        { code: 'DEMO-0001', qr_token: 'demo-max', notes: 'Demo', ...activated(max.id, 30) },
        { code: 'DEMO-0002', qr_token: 'demo-luna', notes: 'Demo', ...activated(luna.id, 12) },
        { code: 'DEMO-0003', qr_token: 'demo-nueva', notes: 'Demo · vendida sin activar', status: 'sold', sold_at: ago(60 * 5) },
        { code: 'DEMO-0004', qr_token: 'demo-libre-1', notes: 'Demo · stock', status: 'available' },
        { code: 'DEMO-0005', qr_token: 'demo-libre-2', notes: 'Demo · stock', status: 'reserved' },
        { code: 'DEMO-0006', qr_token: 'demo-bloqueada', notes: 'Demo · extraviada en bodega', status: 'blocked' },
      ])
      .select('id, qr_token'),
  );
  const tag = Object.fromEntries(tags.map((t) => [t.qr_token, t.id]));

  const steps = [
    db.from('emergency_contacts').insert({ pet_id: max.id, name: 'Camila Demo', phone: '+56987654321', relationship: 'Hermana' }),
    db.from('scans').insert([
      {
        pet_id_reference: tag['demo-max'],
        pet_id: max.id,
        scanned_at: ago(15),
        user_agent: MOBILE_UA,
        device: 'mobile',
        ...ipLocation('Providencia', -33.43, -70.61),
      },
      { pet_id_reference: tag['demo-max'], pet_id: max.id, scanned_at: ago(60 * 26), user_agent: DESKTOP_UA, device: 'desktop' },
      {
        pet_id_reference: tag['demo-luna'],
        pet_id: luna.id,
        scanned_at: ago(40),
        user_agent: MOBILE_UA,
        device: 'mobile',
        ...ipLocation('Santiago', -33.44, -70.65),
        location_source: 'gps',
      },
      {
        pet_id_reference: tag['demo-nueva'],
        pet_id: null,
        scanned_at: ago(60 * 3),
        user_agent: MOBILE_UA,
        device: 'mobile',
        ...ipLocation('Ñuñoa', -33.46, -70.6),
      },
    ]),
    db.from('found_reports').insert({
      pet_id: luna.id,
      reporter_name: 'Pedro',
      reporter_phone: '+56911112222',
      message: 'La vi escondida bajo un auto, está tranquila. Estoy esperando cerca.',
      location_text: 'Plaza Brasil, Santiago',
      latitude: -33.4431,
      longitude: -70.6627,
      created_at: ago(35),
    }),
  ];
  for (const result of await Promise.all(steps)) check(result);

  console.log('✔ Datos de prueba listos');
  console.log(`  Dueño:  ${OWNER.email} / ${OWNER.password}`);
  console.log(`  Admin:  ${ADMIN.email} / ${ADMIN.password}${ADMIN_EMAIL ? `  (y ${ADMIN_EMAIL})` : ''}`);
  console.log('  Perfiles públicos: /p/demo-max  y  /p/demo-luna (perdida)');
  console.log('  PetID sin activar:  /p/demo-nueva  →  /activate/demo-nueva');
}

main().catch((e) => {
  console.error('✖ Seed falló:', e.message ?? e);
  process.exit(1);
});
