// Emails the admin when someone sends the support form, with "Reply-To" set to the sender.
// Called by the support_messages_notify trigger (20260928000100_support_reviews.sql) with the header `x-webhook-secret`.
// Deploy with JWT verification off (the shared secret authenticates the caller).
// Secrets: WEBHOOK_SECRET, RESEND_API_KEY, NOTIFY_FROM (e.g. "PetID <onboarding@resend.dev>"), SUPPORT_EMAIL, APP_URL.
import { createClient } from 'npm:@supabase/supabase-js@2';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const TOPICS: Record<string, string> = {
  activacion: 'Activación de mi PetID',
  pedido: 'Compra o envío',
  renovacion: 'Renovar mi plan',
  tecnico: 'Problema técnico',
  sugerencia: 'Sugerencia',
  otro: 'Otro',
};

const escape = (value: unknown) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

Deno.serve(async (req) => {
  if (req.headers.get('x-webhook-secret') !== Deno.env.get('WEBHOOK_SECRET')) {
    return new Response('unauthorized', { status: 401 });
  }

  const { record } = (await req.json()) as { record: { id: string } };
  const { data: msg } = await db.from('support_messages').select('*').eq('id', record.id).maybeSingle();
  if (!msg) return new Response('message not found', { status: 404 });

  const topic = TOPICS[msg.topic] ?? msg.topic;
  const appUrl = Deno.env.get('APP_URL') ?? '';
  const html = `
    <h2 style="margin:0 0 12px">Nuevo mensaje de soporte</h2>
    <p><strong>Tema:</strong> ${escape(topic)}</p>
    <p><strong>Nombre:</strong> ${escape(msg.name)}<br>
       <strong>Email:</strong> <a href="mailto:${escape(msg.email)}">${escape(msg.email)}</a>
       ${msg.phone ? `<br><strong>Teléfono:</strong> ${escape(msg.phone)}` : ''}
       ${msg.user_id ? '<br><em>Tiene cuenta en PetID</em>' : ''}</p>
    <blockquote style="margin:16px 0;padding:12px 16px;background:#f1f5f9;border-radius:12px;white-space:pre-wrap">${escape(msg.message)}</blockquote>
    <p>Responde este correo para contestarle directamente${appUrl ? `, o revísalo en <a href="${appUrl}/admin/support">el panel</a>` : ''}.</p>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('NOTIFY_FROM'),
      to: Deno.env.get('SUPPORT_EMAIL'),
      reply_to: msg.email,
      subject: `🛟 Soporte · ${topic} · ${msg.name}`,
      html,
    }),
  });

  return new Response(res.ok ? 'sent' : await res.text(), { status: res.ok ? 200 : 502 });
});
