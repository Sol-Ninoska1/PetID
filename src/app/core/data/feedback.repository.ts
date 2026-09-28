import { inject, Injectable } from '@angular/core';
import {
  AdminReview, OwnReview, ReviewInput, ReviewSummary, SupportMessage, SupportMessageInput, SupportStatus,
} from '../models';
import { SupabaseService } from '../supabase/supabase.service';
import { one } from './mappers';

type Row = Record<string, any>;

const toSupportMessage = (r: Row): SupportMessage => ({
  id: r['id'],
  name: r['name'],
  email: r['email'],
  phone: r['phone'],
  topic: r['topic'],
  message: r['message'],
  hasAccount: r['user_id'] != null,
  status: r['status'],
  createdAt: r['created_at'],
  resolvedAt: r['resolved_at'],
});

/** Support messages and customer reviews. */
@Injectable({ providedIn: 'root' })
export class FeedbackRepository {
  private readonly db = inject(SupabaseService).client;

  // ─── Support ─────────────────────────────────────────────────────────────

  /** Anyone can send; the admin gets it by email. Throws `too_many_messages` when rate-limited. */
  async sendSupport(input: SupportMessageInput): Promise<void> {
    const { error } = await this.db.from('support_messages').insert(input);
    if (error) throw new Error(error.message.includes('too_many_messages') ? 'too_many_messages' : error.message);
  }

  /** Admin only (RLS). */
  async listSupport(): Promise<SupportMessage[]> {
    const { data, error } = await this.db.from('support_messages').select('*').order('created_at', { ascending: false }).limit(200);
    if (error) throw error;
    return data.map(toSupportMessage);
  }

  async setSupportStatus(id: string, status: SupportStatus): Promise<void> {
    const { error } = await this.db.from('support_messages').update({ status }).eq('id', id);
    if (error) throw error;
  }

  // ─── Reviews ─────────────────────────────────────────────────────────────

  async publicReviews(limit = 30): Promise<ReviewSummary> {
    const { data, error } = await this.db.rpc('get_public_reviews', { p_limit: limit });
    if (error) throw error;
    const counts = data['counts'] ?? {};
    return {
      average: Number(data['average'] ?? 0),
      total: data['total'] ?? 0,
      counts: [1, 2, 3, 4, 5].map((s) => counts[s] ?? 0),
      reviews: (data['reviews'] ?? []).map((r: Row) => ({
        id: r['id'],
        authorName: r['author_name'],
        rating: r['rating'],
        comment: r['comment'],
        createdAt: r['created_at'],
      })),
    };
  }

  /** Only customers with at least one registered pet can leave a review. */
  async canReview(userId: string): Promise<boolean> {
    const { count, error } = await this.db.from('pets').select('id', { count: 'exact', head: true }).eq('owner_id', userId);
    if (error) throw error;
    return (count ?? 0) > 0;
  }

  async myReview(userId: string): Promise<OwnReview | null> {
    const { data, error } = await this.db.from('reviews').select('id, rating, comment, is_hidden').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return data ? { id: data['id'], rating: data['rating'], comment: data['comment'], isHidden: data['is_hidden'] } : null;
  }

  /** Creates the user's review, or updates it if they already left one. */
  async saveMyReview(existingId: string | null, input: ReviewInput): Promise<void> {
    const { error } = existingId
      ? await this.db.from('reviews').update(input).eq('id', existingId)
      : await this.db.from('reviews').insert(input);
    if (error) throw error;
  }

  async deleteMyReview(id: string): Promise<void> {
    const { error } = await this.db.from('reviews').delete().eq('id', id);
    if (error) throw error;
  }

  /** Admin only (RLS), including hidden reviews. */
  async listReviews(): Promise<AdminReview[]> {
    const { data, error } = await this.db
      .from('reviews')
      .select('*, profiles(email)')
      .order('created_at', { ascending: false })
      .limit(300);
    if (error) throw error;
    return data.map((r: Row) => ({
      id: r['id'],
      authorName: r['author_name'],
      authorEmail: one(r['profiles'])?.['email'] ?? null,
      rating: r['rating'],
      comment: r['comment'],
      isHidden: r['is_hidden'],
      createdAt: r['created_at'],
    }));
  }

  async setReviewHidden(id: string, hidden: boolean): Promise<void> {
    const { error } = await this.db.rpc('admin_set_review_hidden', { p_id: id, p_hidden: hidden });
    if (error) throw error;
  }
}
