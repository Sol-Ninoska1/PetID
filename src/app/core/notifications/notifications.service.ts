import { inject, Injectable, signal } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { ActivityRepository } from '../data/activity.repository';
import { SupabaseService } from '../supabase/supabase.service';

/** Unseen counter for the header bell, shared with the notifications page, kept live through Supabase Realtime. */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly repo = inject(ActivityRepository);
  private readonly db = inject(SupabaseService).client;
  private version = 0;
  private seen: Promise<void> = Promise.resolve();
  private channel: RealtimeChannel | null = null;
  private debounce: ReturnType<typeof setTimeout> | undefined;

  readonly unseen = signal(0);
  /** Bumps when something new arrives while the notifications page is open, so it reloads (and marks it seen). */
  readonly changes = signal(0);
  /** Set by the notifications page while it's open. */
  viewing = false;

  /** Listens while the owner area is open. RLS limits the events to the owner's pets (admins hear every pet). */
  listen() {
    if (this.channel) return;
    const changed = () => {
      // An insert and push-owner's notified_at update arrive together: reload once.
      clearTimeout(this.debounce);
      this.debounce = setTimeout(() => this.refresh(), 1500);
    };
    this.channel = this.db
      .channel('owner-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'found_reports' }, changed)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'location_shares' }, changed)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'scans' }, changed)
      .subscribe();
  }

  stop() {
    clearTimeout(this.debounce);
    if (this.channel) this.db.removeChannel(this.channel);
    this.channel = null;
  }

  async refresh() {
    // A count that was requested before (or while) marking as seen would bring the old number back.
    const version = ++this.version;
    await this.seen.catch(() => undefined);
    try {
      const count = await this.repo.unseenNotificationCount();
      if (version !== this.version) return;
      if (this.viewing && count > 0) this.changes.update((n) => n + 1);
      else this.unseen.set(count);
    } catch {
      // The bell just keeps its last value.
    }
  }

  markSeen(): Promise<void> {
    return this.settle(() => this.repo.markNotificationsSeen());
  }

  clear(): Promise<void> {
    return this.settle(() => this.repo.clearNotifications());
  }

  private settle(request: () => Promise<void>) {
    this.version++;
    this.unseen.set(0);
    this.seen = request();
    return this.seen;
  }
}
