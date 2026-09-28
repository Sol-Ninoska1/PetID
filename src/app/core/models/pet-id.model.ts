import { PetSpecies } from './pet.model';

export type PetIdStatus = 'available' | 'reserved' | 'sold' | 'activated' | 'blocked';

/** What the owner sees of the PetID linked to their pet. */
export interface PetIdSummary {
  id: string;
  code: string;
  qrToken: string;
  status: PetIdStatus;
  activatedAt: string | null;
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
