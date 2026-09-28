// Sends a Web Push notification to the pet owner's devices when their PetID is scanned,
// a finder shares their GPS location, or someone reports the pet as found.
// Called by the database triggers in 20260927000100_push_triggers.sql with the header `x-webhook-secret`.
// Deploy with JWT verification off (the shared secret authenticates the caller).
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:you@domain), WEBHOOK_SECRET.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

type Table = 'scans' | 'location_shares' | 'found_reports';

interface WebhookPayload {
  type: 'INSERT';
  table: Table;
  record: { id: string };
}

interface Notification {
  title: string;
  body: string;
  tag: string;
  url: string;
  mapUrl?: string;
}

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:avisos@petid.app',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
);

/** Repeated scans of the same PetID within this window only notify once. */
const SCAN_COOLDOWN_MS = 2 * 60_000;

const mapsUrl = (lat: number, lng: number) => `https://www.google.com/maps?q=${lat},${lng}`;
const DEVICE: Record<string, string> = { mobile: 'un teléfono', tablet: 'una tablet', desktop: 'un computador' };

async function load(table: Table, id: string) {
  const { data } = await db.from(table).select('*, pets(id, name, sex, is_lost, owner_id)').eq('id', id).maybeSingle();
  return data as (Record<string, any> & { pets: Record<string, any> | null }) | null;
}

async function buildNotification(table: Table, row: Record<string, any>, pet: Record<string, any>): Promise<Notification | null> {
  const activity = `/pets/${pet.id}/activity`;
  const lostWord = pet.sex === 'female' ? 'perdida' : 'perdido';

  if (table === 'scans') {
    const since = new Date(new Date(row.scanned_at).getTime() - SCAN_COOLDOWN_MS).toISOString();
    const { count } = await db
      .from('scans')
      .select('id', { count: 'exact', head: true })
      .eq('pet_id', pet.id)
      .neq('id', row.id)
      .gte('scanned_at', since)
      .lte('scanned_at', row.scanned_at);
    if (count) return null;

    const place = [row.city, row.region].filter(Boolean).join(', ');
    const where = place ? `Cerca de ${place} (aprox.)` : 'Ubicación no disponible';
    return {
      title: pet.is_lost ? `🚨 Escanearon la placa de ${pet.name} (${lostWord})` : `🐾 Escanearon la placa de ${pet.name}`,
      body: `${where} · desde ${DEVICE[row.device] ?? 'un dispositivo'}.${pet.is_lost ? ' Si te comparten el GPS te avisaremos.' : ''}`,
      tag: `scan-${pet.id}`,
      url: activity,
      mapUrl: row.approximate_latitude != null ? mapsUrl(row.approximate_latitude, row.approximate_longitude) : undefined,
    };
  }

  if (table === 'location_shares') {
    const accuracy = row.accuracy_m != null ? ` (±${Math.round(row.accuracy_m)} m)` : '';
    return {
      title: `📍 Ubicación GPS de ${pet.name}`,
      body: `Quien escaneó su placa compartió dónde está${accuracy}. Toca para ver el mapa.`,
      tag: `location-${pet.id}`,
      url: mapsUrl(row.latitude, row.longitude),
      mapUrl: mapsUrl(row.latitude, row.longitude),
    };
  }

  return {
    title: `🚨 ¡Encontraron a ${pet.name}!`,
    body: `${row.reporter_name} · ${row.reporter_phone}${row.message ? ` — "${String(row.message).slice(0, 80)}"` : ''}`,
    tag: `found-${row.id}`,
    url: activity,
    mapUrl: row.latitude != null ? mapsUrl(row.latitude, row.longitude) : undefined,
  };
}

/** Payload format understood by Angular's service worker (ngsw). */
function ngswPayload(n: Notification) {
  const open = (url: string) =>
    url.startsWith('/') ? { operation: 'navigateLastFocusedOrOpen', url } : { operation: 'openWindow', url };
  return JSON.stringify({
    notification: {
      title: n.title,
      body: n.body,
      tag: n.tag,
      renotify: true,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [200, 100, 200],
      actions: n.mapUrl && n.mapUrl !== n.url ? [{ action: 'map', title: 'Ver mapa' }] : [],
      data: {
        onActionClick: {
          default: open(n.url),
          ...(n.mapUrl ? { map: open(n.mapUrl) } : {}),
        },
      },
    },
  });
}

Deno.serve(async (req) => {
  if (req.headers.get('x-webhook-secret') !== Deno.env.get('WEBHOOK_SECRET')) {
    return new Response('unauthorized', { status: 401 });
  }

  const { table, record } = (await req.json()) as WebhookPayload;
  if (!['scans', 'location_shares', 'found_reports'].includes(table) || !record?.id) {
    return new Response('ignored', { status: 200 });
  }

  // Re-read the row instead of trusting the payload.
  const row = await load(table, record.id);
  const pet = row?.pets;
  if (!row || !pet) return new Response('no pet', { status: 200 });

  const notification = await buildNotification(table, row, pet);
  if (!notification) return new Response('throttled', { status: 200 });

  const { data: subscriptions } = await db
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', pet.owner_id);
  if (!subscriptions?.length) return new Response('no subscriptions', { status: 200 });

  const payload = ngswPayload(notification);
  const results = await Promise.allSettled(
    subscriptions.map((s) =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
        TTL: 60 * 60,
        urgency: table === 'scans' && !pet.is_lost ? 'normal' : 'high',
      }),
    ),
  );

  const gone = subscriptions.filter((_, i) => {
    const r = results[i];
    return r.status === 'rejected' && [404, 410].includes((r.reason as { statusCode?: number })?.statusCode ?? 0);
  });
  if (gone.length) {
    await db.from('push_subscriptions').delete().in('id', gone.map((s) => s.id));
  }

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  return new Response(JSON.stringify({ sent, removed: gone.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
