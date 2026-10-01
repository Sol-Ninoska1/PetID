import { ScanDevice } from '../../core/models';

export function petAge(birthDate: string | null): string | null {
  if (!birthDate) return null;
  // Read "YYYY-MM-DD" as a local date: new Date() would take it as UTC midnight, the previous day in Chile.
  const [year, month, day] = birthDate.slice(0, 10).split('-').map(Number);
  const now = new Date();
  const months = (now.getFullYear() - year) * 12 + now.getMonth() + 1 - month - (now.getDate() < day ? 1 : 0);
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
