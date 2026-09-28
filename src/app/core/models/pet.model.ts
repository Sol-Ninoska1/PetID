import type { PetIdSummary } from './pet-id.model';

export type PetSpecies = 'dog' | 'cat' | 'other';
export type PetSex = 'male' | 'female' | 'unknown';

export interface Pet {
  id: string;
  ownerId: string;
  name: string;
  species: PetSpecies;
  breed: string | null;
  sex: PetSex;
  birthDate: string | null;
  color: string | null;
  weight: number | null;
  photoUrl: string | null;
  /** Wide banner shown above the photo on the public profile. */
  coverUrl: string | null;
  description: string | null;
  specialNeeds: string | null;
  allergies: string | null;
  medications: string | null;
  showHealthInfo: boolean;
  showContactPhone: boolean;
  isLost: boolean;
  isActive: boolean;
  /** The physical PetID (collar/plate) this pet was activated with. */
  petId: PetIdSummary | null;
  createdAt: string;
  updatedAt: string;
}

/** Fields the owner can write; id, owner and the PetID link are assigned by the database. */
export type PetInput = Omit<Pet, 'id' | 'ownerId' | 'petId' | 'createdAt' | 'updatedAt'>;

export interface PetWithStats extends Pet {
  scanCount: number;
  lastScanAt: string | null;
}

export const SPECIES_LABELS: Record<PetSpecies, string> = {
  dog: 'Perro',
  cat: 'Gato',
  other: 'Otro',
};

export const SPECIES_EMOJI: Record<PetSpecies, string> = {
  dog: '🐶',
  cat: '🐱',
  other: '🐾',
};

export const SEX_LABELS: Record<PetSex, string> = {
  male: 'Macho',
  female: 'Hembra',
  unknown: 'No indicado',
};
