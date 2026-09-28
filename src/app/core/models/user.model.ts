export type UserRole = 'cliente' | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  createdAt: string;
}
