// Cloudflare Pages Function: GET /api/geo
// Returns the visitor's approximate location from Cloudflare's IP geolocation (city level, can be off by kilometres).
// The IP itself is never returned or stored.

/** @param {{ request: Request & { cf?: Record<string, unknown> } }} context */
export function onRequestGet({ request }) {
  const cf = request.cf ?? {};
  const num = (v) => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));
  return Response.json(
    {
      city: cf.city ?? null,
      region: cf.region ?? null,
      country: cf.country ?? null,
      latitude: num(cf.latitude),
      longitude: num(cf.longitude),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
