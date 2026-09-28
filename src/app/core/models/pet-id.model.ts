import { PetSpecies } from './pet.model';

export type PetIdStatus = 'available' | 'reserved' | 'sold' | 'activated' | 'blocked';

/** What the owner sees of the PetID linked to their pet. */
export interface PetIdSummary {
  id: string;
  code: string;
  qrToken: string;
  status: PetIdStatus;
  activatedAt: string | null;
  /** End of the paid year. Null = never expires (demo, or not activated yet). */
  expiresAt: string | null;
}

/** Admin view of a PetID with its (optional) pet and owner. */
export interface PetIdRecord extends PetIdSummary {
  notes: string | null;
  createdAt: string;
  soldAt: string | null;
  updatedAt: string;
  pet: { id: string; name: string; species: PetSpecies; photoUrl: string | null } | null;
  owner: { id: string; name: string; email: string; phone: string | null } | null;
}

/** The owner starts seeing the renewal notice this many days before the plan ends. */
export const RENEWAL_NOTICE_DAYS = 30;

/** Days until the yearly plan ends (0 or less once expired), or null when it never expires. */
export function planDaysLeft(expiresAt: string | null, now = Date.now()): number | null {
  return expiresAt ? Math.ceil((Date.parse(expiresAt) - now) / 86_400_000) : null;
}

export const isPlanExpired = (expiresAt: string | null, now = Date.now()): boolean =>
  !!expiresAt && Date.parse(expiresAt) <= now;

export const PET_ID_STATUSES: PetIdStatus[] = ['available', 'reserved', 'sold', 'activated', 'blocked'];

export const PET_ID_STATUS_LABELS: Record<PetIdStatus, string> = {
  available: 'Disponible',
  reserved: 'Reservada',
  sold: 'Vendida',
  activated: 'Activada',
  blocked: 'Bloqueada',
};

/** Mirrors admin_set_pet_id_status: 'activated' is only reachable by the owner activating (or unblocking a linked PetID). */
export function allowedPetIdTransitions(status: PetIdStatus, linked: boolean): PetIdStatus[] {
  switch (status) {
    case 'available':
      return ['reserved', 'sold', 'blocked'];
    case 'reserved':
      return ['available', 'sold', 'blocked'];
    case 'sold':
      return ['available', 'blocked'];
    case 'activated':
      return ['blocked'];
    case 'blocked':
      return linked ? ['activated'] : ['available', 'sold'];
  }
}
