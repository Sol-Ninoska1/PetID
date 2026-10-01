import { inject, Injectable } from '@angular/core';
import { FoundReport, LocationShare, OwnerNotification, Scan } from '../models';
import { SupabaseService } from '../supabase/supabase.service';
import { toFoundReport, toLocationShare, toOwnerNotification, toScan } from './mappers';

/** Owner-side read of scans, found reports, shared locations and the notification history. */
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

  /** History of the owner's own pets only (admins can read every row through RLS), newest first. */
  async listNotifications(): Promise<OwnerNotification[]> {
    const { data, error } = await this.db.rpc('list_notifications');
    if (error) throw error;
    return (data ?? []).map(toOwnerNotification);
  }

  async unseenNotificationCount(): Promise<number> {
    const { data, error } = await this.db.rpc('unseen_notification_count');
    if (error) throw error;
    return data ?? 0;
  }

  async markNotificationsSeen(): Promise<void> {
    const { error } = await this.db.rpc('mark_notifications_seen');
    if (error) throw error;
  }

  /** Hides the current history from the notifications page; nothing is deleted. */
  async clearNotifications(): Promise<void> {
    const { error } = await this.db.rpc('clear_notifications');
    if (error) throw error;
  }
}
