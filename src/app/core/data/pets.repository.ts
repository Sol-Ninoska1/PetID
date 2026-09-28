import { inject, Injectable } from '@angular/core';
import { EmergencyContact, EmergencyContactInput, Pet, PetIdSummary, PetInput, PetWithStats } from '../models';
import { SupabaseService } from '../supabase/supabase.service';
import { clean, one, toEmergencyContact, toPet, toPetIdSummary, toPetRow } from './mappers';

const PHOTO_BUCKET = 'pet-photos';
const PET_ID_FIELDS = 'petid:pet_ids(id, code, qr_token, status, activated_at, expires_at)';

/** Owner-side pets and PetIDs. RLS guarantees every query only sees and changes the signed-in owner's rows. */
@Injectable({ providedIn: 'root' })
export class PetsRepository {
  private readonly db = inject(SupabaseService).client;

  async listMine(): Promise<PetWithStats[]> {
    const { data, error } = await this.db
      .from('pets')
      .select(`*, ${PET_ID_FIELDS}, scan_count:scans(count), last_scan:scans(scanned_at)`)
      .eq('owner_id', await this.requireUserId())
      .order('created_at', { ascending: false })
      .order('scanned_at', { referencedTable: 'last_scan', ascending: false })
      .limit(1, { referencedTable: 'last_scan' });
    if (error) throw error;
    return data.map((row) => ({
      ...toPet(row),
      scanCount: row.scan_count?.[0]?.count ?? 0,
      lastScanAt: row.last_scan?.[0]?.scanned_at ?? null,
    }));
  }

  async getById(id: string): Promise<{ pet: Pet; emergencyContact: EmergencyContact | null }> {
    const { data, error } = await this.db
      .from('pets')
      .select(`*, ${PET_ID_FIELDS}, emergency_contacts(*)`)
      .eq('id', id)
      .eq('owner_id', await this.requireUserId())
      .single();
    if (error) throw error;
    const contact = one(data.emergency_contacts);
    return { pet: toPet(data), emergencyContact: contact ? toEmergencyContact(contact) : null };
  }

  /** Returns the PetID only when it's linked to one of the signed-in user's pets. */
  async findOwnedPetId(qrToken: string): Promise<(PetIdSummary & { petId: string }) | null> {
    const userId = (await this.db.auth.getSession()).data.session?.user.id;
    if (!userId) return null;
    const { data, error } = await this.db
      .from('pet_ids')
      .select('id, code, qr_token, status, activated_at, expires_at, pet_id')
      .eq('qr_token', qrToken)
      .eq('owner_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data ? { ...toPetIdSummary(data), petId: data.pet_id } : null;
  }

  /** Links the PetID to a new pet owned by the current user. Fails if someone already activated it. */
  async activate(qrToken: string, input: PetInput, contact: EmergencyContactInput | null): Promise<string> {
    const { data: petId, error } = await this.db.rpc('activate_pet_id', { p_token: qrToken, p_pet: toPetRow(input) });
    if (error) throw error;
    await this.saveEmergencyContact(petId, contact);
    return petId;
  }

  async update(id: string, input: PetInput, contact: EmergencyContactInput | null): Promise<void> {
    const { error } = await this.db.from('pets').update(toPetRow(input)).eq('id', id);
    if (error) throw error;
    await this.saveEmergencyContact(id, contact);
  }

  async setLost(id: string, isLost: boolean): Promise<void> {
    const { error } = await this.db.from('pets').update({ is_lost: isLost }).eq('id', id);
    if (error) throw error;
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await this.db.from('pets').update({ is_active: isActive }).eq('id', id);
    if (error) throw error;
  }

  /** The database frees the PetID so its QR shows the activation screen again. */
  async remove(id: string): Promise<void> {
    const { error } = await this.db.from('pets').delete().eq('id', id);
    if (error) throw error;
  }

  async uploadPhoto(ownerId: string, file: Blob): Promise<string> {
    const path = `${ownerId}/${crypto.randomUUID()}.jpg`;
    const { error } = await this.db.storage
      .from(PHOTO_BUCKET)
      .upload(path, file, { contentType: 'image/jpeg', upsert: false });
    if (error) throw error;
    return this.db.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
  }

  /** Admins can read every pet (RLS), so owner screens must filter by owner explicitly. */
  private async requireUserId(): Promise<string> {
    const userId = (await this.db.auth.getSession()).data.session?.user.id;
    if (!userId) throw new Error('not_authenticated');
    return userId;
  }

  /** One emergency contact per pet for the MVP: replaces the existing one, or removes it when null. */
  private async saveEmergencyContact(petId: string, contact: EmergencyContactInput | null): Promise<void> {
    const { error: deleteError } = await this.db.from('emergency_contacts').delete().eq('pet_id', petId);
    if (deleteError) throw deleteError;
    if (!contact) return;
    const { error } = await this.db.from('emergency_contacts').insert({
      pet_id: petId,
      name: contact.name.trim(),
      phone: contact.phone.trim(),
      relationship: clean(contact.relationship),
    });
    if (error) throw error;
  }
}
