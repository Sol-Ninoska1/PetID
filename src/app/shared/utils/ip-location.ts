export interface IpLocation {
  city: string | null;
  region: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
}

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 80) : null);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/**
 * City-level estimate from the hosting edge (Cloudflare Pages Function at /api/geo).
 * Null in local development or when the endpoint is slow: a scan is never delayed for long.
 */
export async function fetchIpLocation(timeoutMs = 1500): Promise<IpLocation | null> {
  try {
    const res = await fetch('/api/geo', { signal: AbortSignal.timeout(timeoutMs), cache: 'no-store' });
    if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) return null;
    const data = await res.json();
    const location = {
      city: str(data.city),
      region: str(data.region),
      country: str(data.country),
      latitude: num(data.latitude),
      longitude: num(data.longitude),
    };
    return location.city || location.latitude != null ? location : null;
  } catch {
    return null;
  }
}
