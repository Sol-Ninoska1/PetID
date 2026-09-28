import { ScanDevice } from '../../core/models';

export function petAge(birthDate: string | null): string | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const now = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
  if (months < 1) return 'Menos de un mes';
  if (months < 12) return `${months} ${months === 1 ? 'mes' : 'meses'}`;
  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? 'año' : 'años'}`;
}

const DEVICE_LABELS: Record<ScanDevice, string> = { mobile: 'Teléfono', tablet: 'Tablet', desktop: 'Computador' };

/** Coarse device type only; the full user agent is never shown. */
export const deviceLabel = (userAgent: string | null, device: ScanDevice | null = null) =>
  device
    ? DEVICE_LABELS[device]
    : userAgent && /Mobi|Android|iPhone|iPad/i.test(userAgent)
      ? 'Teléfono'
      : 'Computador';
