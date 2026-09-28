export type SupportTopic = 'activacion' | 'pedido' | 'tecnico' | 'sugerencia' | 'otro';
export type SupportStatus = 'nuevo' | 'resuelto';

export interface SupportMessageInput {
  name: string;
  email: string;
  phone: string | null;
  topic: SupportTopic;
  message: string;
}

export interface SupportMessage extends SupportMessageInput {
  id: string;
  hasAccount: boolean;
  status: SupportStatus;
  createdAt: string;
  resolvedAt: string | null;
}

export interface ReviewInput {
  rating: number;
  comment: string | null;
}

export interface PublicReview {
  id: string;
  authorName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface ReviewSummary {
  average: number;
  total: number;
  /** Number of reviews per star, index 0 = 1 star. */
  counts: number[];
  reviews: PublicReview[];
}

export interface OwnReview extends ReviewInput {
  id: string;
  isHidden: boolean;
}

export interface AdminReview extends PublicReview {
  authorEmail: string | null;
  isHidden: boolean;
}
