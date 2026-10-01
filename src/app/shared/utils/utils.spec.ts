import { authErrorMessage } from '../../core/auth/auth-errors';
import { safeReturnUrl } from '../../core/auth/auth.service';
import { toOwnerNotification, toPublicPetIdState } from '../../core/data/mappers';
import { allowedPetIdTransitions, totalStock } from '../../core/models';
import { RelativeTimePipe } from '../pipes/relative-time.pipe';
import { PHONE_PATTERN, telHref, whatsappHref } from './contact';
import { deviceLabel, petAge } from './pet';
import { fetchIpLocation } from './ip-location';
import { formatClp } from './money';
import { extractQrToken, labelPdf, labelSvg, publicPetIdUrl } from './qr-label';

describe('shared utils', () => {
  it('formats relative times in Spanish', () => {
    const pipe = new RelativeTimePipe();
    expect(pipe.transform(new Date(Date.now() - 15 * 60_000))).toBe('hace 15 minutos');
    expect(pipe.transform(new Date(Date.now() - 26 * 3_600_000))).toBe('ayer');
    expect(pipe.transform(new Date())).toBe('hace un momento');
  });

  it('computes pet age in months or years', () => {
    const monthsAgo = (m: number) => {
      const d = new Date();
      d.setMonth(d.getMonth() - m);
      return d.toISOString().slice(0, 10);
    };
    expect(petAge(null)).toBeNull();
    expect(petAge(monthsAgo(8))).toBe('8 meses');
    expect(petAge(monthsAgo(12))).toBe('1 año');
    expect(petAge(monthsAgo(40))).toBe('3 años');
  });

  it('builds contact links from formatted phones', () => {
    expect(PHONE_PATTERN.test('+56 9 1234 5678')).toBe(true);
    expect(PHONE_PATTERN.test('abc')).toBe(false);
    expect(telHref('+56 9 1234-5678')).toBe('tel:+56912345678');
    expect(whatsappHref('+56 9 1234 5678', 'Hola Max')).toBe('https://wa.me/56912345678?text=Hola%20Max');
  });

  it('only exposes a coarse device type', () => {
    expect(deviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Mobile')).toBe('Teléfono');
    expect(deviceLabel('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)')).toBe('Computador');
    expect(deviceLabel(null, 'tablet')).toBe('Tablet');
  });

  it('extracts the PetID token from a pasted link or a bare token', () => {
    expect(extractQrToken('https://petid.cl/p/Ab3_x-9Kq2')).toBe('Ab3_x-9Kq2');
    expect(extractQrToken('http://localhost:4200/activate/demo-nueva?x=1')).toBe('demo-nueva');
    expect(extractQrToken('  demo-max/ ')).toBe('demo-max');
    expect(extractQrToken('https://petid.cl/dashboard')).toBeNull();
    expect(extractQrToken('abc')).toBeNull();
  });

  it('builds printable labels that encode only the public URL', () => {
    const label = { code: 'PET-00001', url: publicPetIdUrl('demo-max') };
    expect(label.url.endsWith('/p/demo-max')).toBe(true);

    const svg = labelSvg({ ...label, code: 'PET-<1>' });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('width="40mm"');
    expect(svg).toContain('PET-&lt;1&gt;');

    const round = labelSvg({ ...label, name: 'Max & Co' }, 'round');
    expect(round).toContain('width="30mm"');
    expect(round).toContain('Max &amp; Co');
    expect(round).toContain('Escanéame');
    expect(round).not.toContain('PET-00001');

    expect(labelSvg(label, 'round', 'back')).not.toContain('<text');
  });

  it('generates a valid single-page PDF label', async () => {
    const pdf = await labelPdf({ code: 'PET-00001', url: 'https://petid.cl/p/demo-max' }).text();
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf).toContain('(PET-00001) Tj');
    expect(pdf.trimEnd().endsWith('%%EOF')).toBe(true);
    const xref = Number(pdf.match(/startxref\n(\d+)/)![1]);
    expect(pdf.slice(xref, xref + 4)).toBe('xref');

    const round = new Uint8Array(await labelPdf({ code: 'PET-00001', url: 'https://petid.cl/p/demo-max', name: 'Ñandú' }, 'round').arrayBuffer());
    const latin1 = String.fromCharCode(...round);
    expect(latin1).toContain('(\xd1and\xfa) Tj');
    expect(latin1).toContain('(Escan\xe9ame) Tj');
  });

  it('only allows PetID status changes the database accepts', () => {
    expect(allowedPetIdTransitions('available', false)).toContain('sold');
    expect(allowedPetIdTransitions('activated', true)).toEqual(['blocked']);
    expect(allowedPetIdTransitions('blocked', true)).toEqual(['activated']);
    expect(allowedPetIdTransitions('blocked', false)).not.toContain('activated');
  });

  it('maps the public PetID state', () => {
    expect(toPublicPetIdState({ status: 'unactivated', code: 'PET-00007' })).toEqual({ status: 'unactivated', code: 'PET-00007' });
    expect(toPublicPetIdState({ status: 'blocked' })).toEqual({ status: 'blocked' });
    expect(toPublicPetIdState({ status: 'inactive' })).toEqual({ status: 'inactive' });
  });

  it('maps the notification history rows', () => {
    const at = '2026-10-01T15:00:00Z';
    const report = toOwnerNotification({
      kind: 'found_report', created_at: at, pet_name: 'Hachi', unseen: true,
      payload: { id: 'r1', pet_id: 'p1', reporter_name: 'Sol', reporter_phone: '+56912345678', latitude: -33.4, longitude: -70.6, created_at: at },
    });
    expect(report).toMatchObject({ id: 'found_report:r1', kind: 'found_report', petName: 'Hachi', unseen: true });
    expect(report.kind === 'found_report' && report.data.location.point).toEqual({ lat: -33.4, lng: -70.6 });

    const scan = toOwnerNotification({
      kind: 'scan', created_at: at, pet_name: 'Hachi', unseen: false,
      payload: { id: 's1', pet_id: 'p1', scanned_at: at, city: 'Providencia', region: 'RM' },
    });
    expect(scan).toMatchObject({ id: 'scan:s1', kind: 'scan', unseen: false });
    expect(scan.kind === 'scan' && scan.data.place).toBe('Providencia, RM');
  });

  it('reads the IP location from /api/geo and ignores non-JSON responses', async () => {
    const realFetch = globalThis.fetch;
    const respond = (body: string, type: string) => {
      globalThis.fetch = async () => new Response(body, { headers: { 'content-type': type } });
    };
    try {
      respond(JSON.stringify({ city: ' Providencia ', region: 'Santiago Metropolitan', country: 'CL', latitude: -33.43, longitude: '-70.6' }), 'application/json');
      expect(await fetchIpLocation()).toEqual({
        city: 'Providencia',
        region: 'Santiago Metropolitan',
        country: 'CL',
        latitude: -33.43,
        longitude: null,
      });

      respond('<!doctype html><html></html>', 'text/html');
      expect(await fetchIpLocation()).toBeNull();

      respond(JSON.stringify({ city: null, latitude: null }), 'application/json');
      expect(await fetchIpLocation()).toBeNull();
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it('formats Chilean peso prices', () => {
    expect(formatClp(12990).replace(/\s/g, '')).toBe('$12.990');
    expect(totalStock({ variants: [{ color: 'Rojo', size: 'M', stock: 3 }, { color: null, size: null, stock: 2 }] })).toBe(5);
  });

  it('only follows same-site return URLs', () => {
    expect(safeReturnUrl('/activate/demo-nueva')).toBe('/activate/demo-nueva');
    expect(safeReturnUrl('//evil.com')).toBe('/dashboard');
    expect(safeReturnUrl('https://evil.com')).toBe('/dashboard');
    expect(safeReturnUrl(null)).toBe('/dashboard');
  });

  it('maps Supabase auth errors to friendly messages', () => {
    expect(authErrorMessage(new Error('Invalid login credentials'))).toBe('Email o contraseña incorrectos.');
    expect(authErrorMessage(new Error('something odd'))).toBe('Ocurrió un error. Inténtalo de nuevo.');
  });
});
