import { inject, Injectable } from '@angular/core';
import { FoundReport, PetIdRecord, PetIdStatus, PetSpecies, UserProfile } from '../models';
import { SupabaseService } from '../supabase/supabase.service';
import { one, toFoundReport, toPetIdRecord, toProfile } from './mappers';

const PET_ID_SELECT =
  '*, pet:pets!pet_ids_pet_id_fkey(id, name, species, photo_url), owner:profiles!pet_ids_owner_id_fkey(id, name, email, phone)';

export interface AdminStats {
  petIds: Record<PetIdStatus, number>;
  pets: number;
  lostPets: number;
  users: number;
  newReports: number;
  scansLast7Days: number;
}

export interface AdminPetRow {
  id: string;
  name: string;
  species: PetSpecies;
  breed: string | null;
  photoUrl: string | null;
  isLost: boolean;
  isActive: boolean;
  createdAt: string;
  ownerName: string | null;
  ownerEmail: string | null;
  petIdCode: string | null;
  petIdQrToken: string | null;
}

export interface AdminUserRow extends UserProfile {
  petCount: number;
}

export interface AdminReportRow extends FoundReport {
  petIdCode: string | null;
}

export interface PetIdQuery {
  status?: PetIdStatus | null;
  search?: string;
  orderBy?: 'created_at' | 'activated_at';
  limit?: number;
}

/**
 * Admin-only reads and actions. The UI hides these screens from owners, but the real barrier is the database:
 * RLS "admin reads" policies and admin_* functions that check profiles.role.
 */
@Injectable({ providedIn: 'root' })
export class AdminRepository {
  private readonly db = inject(SupabaseService).client;

  async stats(): Promise<AdminStats> {
    const count = async (query: PromiseLike<{ count: number | null; error: unknown }>) => {
      const { count, error } = await query;
      if (error) throw error;
      return count ?? 0;
    };
    const head = { count: 'exact' as const, head: true };
    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

    const statuses: PetIdStatus[] = ['available', 'reserved', 'sold', 'activated', 'blocked'];
    const [petIdCounts, pets, lostPets, users, newReports, scansLast7Days] = await Promise.all([
      Promise.all(statuses.map((s) => count(this.db.from('pet_ids').select('id', head).eq('status', s)))),
      count(this.db.from('pets').select('id', head)),
      count(this.db.from('pets').select('id', head).eq('is_lost', true)),
      count(this.db.from('profiles').select('id', head)),
      count(this.db.from('found_reports').select('id', head).eq('status', 'new')),
      count(this.db.from('scans').select('id', head).gte('scanned_at', weekAgo)),
    ]);

    return {
      petIds: Object.fromEntries(statuses.map((s, i) => [s, petIdCounts[i]])) as Record<PetIdStatus, number>,
      pets,
      lostPets,
      users,
      newReports,
      scansLast7Days,
    };
  }

  async listPetIds({ status, search, orderBy = 'created_at', limit = 300 }: PetIdQuery = {}): Promise<PetIdRecord[]> {
    let query = this.db.from('pet_ids').select(PET_ID_SELECT);
    if (status) query = query.eq('status', status);
    const term = search?.trim().replace(/[%_,()]/g, '');
    if (term) query = query.ilike('code', `%${term}%`);
    const { data, error } = await query
      .order(orderBy, { ascending: false, nullsFirst: false })
      .order('code', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data.map(toPetIdRecord);
  }

  async getPetId(id: string): Promise<PetIdRecord> {
    const { data, error } = await this.db.from('pet_ids').select(PET_ID_SELECT).eq('id', id).single();
    if (error) throw error;
    return toPetIdRecord(data);
  }

  async getPetIds(ids: string[]): Promise<PetIdRecord[]> {
    const { data, error } = await this.db.from('pet_ids').select(PET_ID_SELECT).in('id', ids).order('code');
    if (error) throw error;
    return data.map(toPetIdRecord);
  }

  /** Generates `count` PetIDs (code + secure QR token), all starting as available. */
  async createPetIds(count: number, notes: string | null): Promise<string[]> {
    const { data, error } = await this.db.rpc('admin_create_pet_ids', { p_count: count, p_notes: notes });
    if (error) throw error;
    return (data as { id: string }[]).map((r) => r.id);
  }

  async setPetIdStatus(id: string, status: PetIdStatus): Promise<void> {
    const { error } = await this.db.rpc('admin_set_pet_id_status', { p_id: id, p_status: status });
    if (error) throw error;
  }

  /** Extends the yearly plan (from today if it already expired). Call it after receiving the payment. */
  async renewPetId(id: string, years = 1): Promise<void> {
    const { error } = await this.db.rpc('admin_renew_pet_id', { p_id: id, p_years: years });
    if (error) throw error;
  }

  async listPets(limit = 300): Promise<AdminPetRow[]> {
    const { data, error } = await this.db
      .from('pets')
      .select(
        'id, name, species, breed, photo_url, is_lost, is_active, created_at, owner:profiles!pets_owner_id_fkey(name, email), petid:pet_ids(code, qr_token)',
      )
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data.map((r: Record<string, any>) => {
      const owner = one(r['owner']);
      const petId = one(r['petid']);
      return {
        id: r['id'],
        name: r['name'],
        species: r['species'],
        breed: r['breed'],
        photoUrl: r['photo_url'],
        isLost: r['is_lost'],
        isActive: r['is_active'],
        createdAt: r['created_at'],
        ownerName: owner?.['name'] ?? null,
        ownerEmail: owner?.['email'] ?? null,
        petIdCode: petId?.['code'] ?? null,
        petIdQrToken: petId?.['qr_token'] ?? null,
      };
    });
  }

  async listUsers(limit = 300): Promise<AdminUserRow[]> {
    const { data, error } = await this.db
      .from('profiles')
      .select('*, pets!pets_owner_id_fkey(count)')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data.map((r) => ({ ...toProfile(r), petCount: r.pets?.[0]?.count ?? 0 }));
  }

  async listReports(limit = 300): Promise<AdminReportRow[]> {
    const { data, error } = await this.db
      .from('found_reports')
      .select('*, pets(name, petid:pet_ids(code))')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data.map((r) => ({ ...toFoundReport(r), petIdCode: one(one(r.pets)?.['petid'])?.['code'] ?? null }));
  }
}
