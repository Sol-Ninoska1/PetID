// Emails the owner when a found report or a shared location is inserted.
// Wire it with two Database Webhooks (INSERT on public.found_reports and public.location_shares) pointing to this function.
// Secrets: RESEND_API_KEY, NOTIFY_FROM (e.g. "PetID <avisos@tudominio.cl>"), APP_URL (e.g. https://petid.cl).
import { createClient } from 'npm:@supabase/supabase-js@2';

interface WebhookPayload {
  type: 'INSERT';
  table: 'found_reports' | 'location_shares';
  record: Record<string, any>;
}

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const escape = (value: unknown) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const mapsLink = (lat: number, lng: number) => `https://www.google.com/maps?q=${lat},${lng}`;

Deno.serve(async (req) => {
  const { table, record } = (await req.json()) as WebhookPayload;

  const { data: pet } = await db.from('pets').select('name, profiles(name, email)').eq('id', record.pet_id).single();
  const owner = (pet as any)?.profiles;
  if (!pet || !owner?.email) return new Response('owner not found', { status: 404 });

  const appUrl = Deno.env.get('APP_URL') ?? '';
  let subject: string;
  let body: string;

  if (table === 'found_reports') {
    subject = `🚨 ${pet.name} fue encontrado`;
    body = `
      <p>Hola ${escape(owner.name)},</p>
      <p><strong>${escape(record.reporter_name || 'Alguien')}</strong> encontró a <strong>${escape(pet.name)}</strong>.</p>
      ${record.reporter_phone ? `<p>📞 ${escape(record.reporter_phone)}${record.reporter_email ? ` · ✉️ ${escape(record.reporter_email)}` : ''}</p>` : ''}
      ${record.message ? `<p>"${escape(record.message)}"</p>` : ''}
      ${record.location_text ? `<p>📍 ${escape(record.location_text)}</p>` : ''}
      ${record.latitude != null ? `<p><a href="${mapsLink(record.latitude, record.longitude)}">Ver ubicación en el mapa</a></p>` : ''}`;
  } else {
    subject = `📍 Recibiste la ubicación de ${pet.name}`;
    body = `
      <p>Hola ${escape(owner.name)},</p>
      <p>Alguien escaneó la placa de <strong>${escape(pet.name)}</strong> y te envió su ubicación.</p>
      <p><a href="${mapsLink(record.latitude, record.longitude)}">Ver ubicación en el mapa</a></p>`;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('NOTIFY_FROM'),
      to: owner.email,
      subject,
      html: `${body}<p><a href="${appUrl}/dashboard">Abrir PetID</a></p>`,
    }),
  });

  return new Response(res.ok ? 'sent' : await res.text(), { status: res.ok ? 200 : 502 });
});
