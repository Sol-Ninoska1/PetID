import { inject, Injectable } from '@angular/core';
import { FoundReport, LocationShare, OwnerAlert, Scan } from '../models';
import { SupabaseService } from '../supabase/supabase.service';
import { toFoundReport, toLocationShare, toScan } from './mappers';

/** Owner-side read of scans, found reports and shared locations (RLS limits rows to the owner's pets). */
@Injectable({ providedIn: 'root' })
export class ActivityRepository {
  private readonly db = inject(SupabaseService).client;

  async listScans(petId: string, limit = 50): Promise<Scan[]> {
    const { data, error } = await this.db
      .from('scans')
      .select('*')
      .eq('pet_id', petId)
      .order('scanned_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data.map(toScan);
  }

  async listFoundReports(petId: string): Promise<FoundReport[]> {
    const { data, error } = await this.db
      .from('found_reports')
      .select('*')
      .eq('pet_id', petId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(toFoundReport);
  }

  async listLocationShares(petId: string): Promise<LocationShare[]> {
    const { data, error } = await this.db
      .from('location_shares')
      .select('*')
      .eq('pet_id', petId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(toLocationShare);
  }

  /** Unread found reports and shared locations across all the owner's pets, newest first. */
  async listUnreadAlerts(): Promise<OwnerAlert[]> {
    const userId = (await this.db.auth.getSession()).data.session?.user.id;
    if (!userId) return [];
    // Admins can read every report (RLS), so only keep the ones for this user's pets.
    const [reports, shares] = await Promise.all([
      this.db
        .from('found_reports')
        .select('*, pets!inner(name, owner_id)')
        .eq('pets.owner_id', userId)
        .is('read_at', null)
        .order('created_at', { ascending: false }),
      this.db
        .from('location_shares')
        .select('*, pets!inner(name, owner_id)')
        .eq('pets.owner_id', userId)
        .is('read_at', null)
        .order('created_at', { ascending: false }),
    ]);
    if (reports.error) throw reports.error;
    if (shares.error) throw shares.error;

    const alerts: OwnerAlert[] = [
      ...reports.data.map((r) => ({ kind: 'found_report' as const, createdAt: r.created_at, data: toFoundReport(r) })),
      ...shares.data.map((r) => ({ kind: 'location_share' as const, createdAt: r.created_at, data: toLocationShare(r) })),
    ];
    return alerts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async markRead(alert: OwnerAlert): Promise<void> {
    const readAt = new Date().toISOString();
    const { error } =
      alert.kind === 'found_report'
        ? await this.db.from('found_reports').update({ read_at: readAt, status: 'read' }).eq('id', alert.data.id)
        : await this.db.from('location_shares').update({ read_at: readAt }).eq('id', alert.data.id);
    if (error) throw error;
  }
}
