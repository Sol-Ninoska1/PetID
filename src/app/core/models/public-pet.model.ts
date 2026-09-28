import { PetSex, PetSpecies } from './pet.model';

/** What an anonymous visitor sees after scanning the QR (see get_public_pet_id in the SQL schema). */
export interface PublicPet {
  name: string;
  species: PetSpecies;
  breed: string | null;
  sex: PetSex;
  color: string | null;
  birthDate: string | null;
  weight: number | null;
  photoUrl: string | null;
  coverUrl: string | null;
  description: string | null;
  isLost: boolean;
  specialNeeds: string | null;
  allergies: string | null;
  medications: string | null;
  ownerFirstName: string;
  contactPhone: string | null;
}

/**
 * Result of resolving a QR token. `inactive` means the owner paused the public profile.
 * `expired`: the yearly plan ended, so only the basics come back (name, photo, contact); the rest is null.
 */
export type PublicPetIdState =
  | { status: 'unactivated'; code: string }
  | { status: 'blocked' }
  | { status: 'inactive' }
  | { status: 'active'; expired: boolean; pet: PublicPet };
