import {
  EmergencyContact,
  FoundReport,
  GeoPoint,
  LocationShare,
  Pet,
  PetIdRecord,
  PetIdSummary,
  PetInput,
  PublicPet,
  PublicPetIdState,
  Scan,
  UserProfile,
} from '../models';

type Row = Record<string, any>;

/** Trims text and stores empty values as null. */
export const clean = (value: string | null | undefined): string | null => value?.trim() || null;

/** PostgREST returns one-to-one embeds as an object, but older versions (or ambiguous FKs) as an array. */
export const one = <T = Row>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? (value[0] ?? null) : (value ?? null);

const point = (lat: unknown, lng: unknown): GeoPoint | null =>
  lat == null || lng == null ? null : { lat: Number(lat), lng: Number(lng) };

export const toPetIdSummary = (r: Row): PetIdSummary => ({
  id: r['id'],
  code: r['code'],
  qrToken: r['qr_token'],
  status: r['status'],
  activatedAt: r['activated_at'] ?? null,
});

export const toPetIdRecord = (r: Row): PetIdRecord => {
  const pet = one(r['pet']);
  const owner = one(r['owner']);
  return {
    ...toPetIdSummary(r),
    notes: r['notes'],
    createdAt: r['created_at'],
    soldAt: r['sold_at'],
    updatedAt: r['updated_at'],
    pet: pet ? { id: pet['id'], name: pet['name'], species: pet['species'], photoUrl: pet['photo_url'] } : null,
    owner: owner ? { id: owner['id'], name: owner['name'], email: owner['email'], phone: owner['phone'] } : null,
  };
};

export const toProfile = (r: Row): UserProfile => ({
  id: r['id'],
  name: r['name'],
  email: r['email'],
  phone: r['phone'],
  role: r['role'] ?? 'cliente',
  createdAt: r['created_at'],
});

export const toPet = (r: Row): Pet => {
  const petId = one(r['petid']);
  return {
    id: r['id'],
    ownerId: r['owner_id'],
    name: r['name'],
    species: r['species'],
    breed: r['breed'],
    sex: r['sex'],
    birthDate: r['birth_date'],
    color: r['color'],
    weight: r['weight'] == null ? null : Number(r['weight']),
    photoUrl: r['photo_url'],
    coverUrl: r['cover_url'] ?? null,
    description: r['description'],
    specialNeeds: r['special_needs'],
    allergies: r['allergies'],
    medications: r['medications'],
    showHealthInfo: r['show_health_info'],
    showContactPhone: r['show_contact_phone'],
    isLost: r['is_lost'],
    isActive: r['is_active'],
    petId: petId ? toPetIdSummary(petId) : null,
    createdAt: r['created_at'],
    updatedAt: r['updated_at'],
  };
};

export const toPetRow = (p: PetInput): Row => ({
  name: p.name.trim(),
  species: p.species,
  breed: clean(p.breed),
  sex: p.sex,
  birth_date: p.birthDate || null,
  color: clean(p.color),
  weight: p.weight || null,
  photo_url: p.photoUrl,
  cover_url: p.coverUrl,
  description: clean(p.description),
  special_needs: clean(p.specialNeeds),
  allergies: clean(p.allergies),
  medications: clean(p.medications),
  show_health_info: p.showHealthInfo,
  show_contact_phone: p.showContactPhone,
  is_lost: p.isLost,
  is_active: p.isActive,
});

export const toPublicPet = (r: Row): PublicPet => ({
  name: r['name'],
  species: r['species'],
  breed: r['breed'],
  sex: r['sex'],
  color: r['color'],
  birthDate: r['birth_date'],
  weight: r['weight'] == null ? null : Number(r['weight']),
  photoUrl: r['photo_url'],
  coverUrl: r['cover_url'] ?? null,
  description: r['description'],
  isLost: r['is_lost'],
  specialNeeds: r['special_needs'],
  allergies: r['allergies'],
  medications: r['medications'],
  ownerFirstName: r['owner_first_name'],
  contactPhone: r['contact_phone'],
});

export const toPublicPetIdState = (r: Row): PublicPetIdState => {
  switch (r['status']) {
    case 'active':
      return { status: 'active', pet: toPublicPet(r['pet']) };
    case 'unactivated':
      return { status: 'unactivated', code: r['code'] };
    case 'inactive':
      return { status: 'inactive' };
    default:
      return { status: 'blocked' };
  }
};

export const toEmergencyContact = (r: Row): EmergencyContact => ({
  id: r['id'],
  petId: r['pet_id'],
  name: r['name'],
  phone: r['phone'],
  relationship: r['relationship'],
});

export const toScan = (r: Row): Scan => ({
  id: r['id'],
  petId: r['pet_id'],
  scannedAt: r['scanned_at'],
  approximateLocation: point(r['approximate_latitude'], r['approximate_longitude']),
  locationSource: r['location_source'] ?? null,
  place: [r['city'], r['region']].filter(Boolean).join(', ') || null,
  userAgent: r['user_agent'],
  device: r['device'] ?? null,
});

export const toFoundReport = (r: Row): FoundReport => ({
  id: r['id'],
  petId: r['pet_id'],
  petName: one(r['pets'])?.['name'],
  status: r['status'] ?? 'new',
  reporterName: r['reporter_name'],
  reporterPhone: r['reporter_phone'],
  reporterEmail: r['reporter_email'],
  message: r['message'],
  location: { text: r['location_text'], point: point(r['latitude'], r['longitude']) },
  createdAt: r['created_at'],
  readAt: r['read_at'],
});

export const toLocationShare = (r: Row): LocationShare => ({
  id: r['id'],
  petId: r['pet_id'],
  petName: one(r['pets'])?.['name'],
  point: point(r['latitude'], r['longitude'])!,
  accuracyM: r['accuracy_m'] == null ? null : Number(r['accuracy_m']),
  createdAt: r['created_at'],
  readAt: r['read_at'],
});
