export interface EmergencyContact {
  id: string;
  petId: string;
  name: string;
  phone: string;
  relationship: string | null;
}

export type EmergencyContactInput = Omit<EmergencyContact, 'id' | 'petId'>;
