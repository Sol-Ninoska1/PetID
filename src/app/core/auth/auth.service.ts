import { computed, effect, inject, Injectable, Injector, signal } from '@angular/core';
import { Session } from '@supabase/supabase-js';
import { toProfile } from '../data/mappers';
import { UserProfile } from '../models';
import { PushService } from '../push/push.service';
import { setRememberSession } from '../supabase/remember-storage';
import { SupabaseService } from '../supabase/supabase.service';

export interface SignUpData {
  name: string;
  email: string;
  phone: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly db = inject(SupabaseService).client;
  private readonly injector = inject(Injector);

  private readonly _session = signal<Session | null>(null);
  readonly session = this._session.asReadonly();
  readonly userId = computed(() => this._session()?.user.id ?? null);
  readonly isAuthenticated = computed(() => this.userId() !== null);
  readonly profile = signal<UserProfile | null>(null);
  readonly isAdmin = computed(() => this.profile()?.role === 'admin');
  readonly initialized = signal(false);

  /** Resolves once the persisted session has been restored; guards wait on it. */
  readonly ready: Promise<void>;

  private profileRequest: { userId: string; promise: Promise<UserProfile | null> } | null = null;

  constructor() {
    this.ready = this.db.auth.getSession().then(({ data }) => {
      this._session.set(data.session);
      this.initialized.set(true);
    });
    this.db.auth.onAuthStateChange((_event, session) => this._session.set(session));

    effect(() => {
      const id = this.userId();
      if (id) {
        void this.loadProfile();
      } else {
        this.profileRequest = null;
        this.profile.set(null);
      }
    });
  }

  /** Current user's profile (with role), fetched once per user. */
  loadProfile(): Promise<UserProfile | null> {
    const userId = this.userId();
    if (!userId) return Promise.resolve(null);
    if (this.profileRequest?.userId !== userId) {
      const promise = Promise.resolve(this.db.from('profiles').select('*').eq('id', userId).maybeSingle()).then(
        ({ data, error }) => {
          if (error) this.profileRequest = null;
          const profile = data ? toProfile(data) : null;
          this.profile.set(profile);
          return profile;
        },
      );
      this.profileRequest = { userId, promise };
    }
    return this.profileRequest.promise;
  }

  /**
   * Returns true when a session was created; false when Supabase requires email confirmation first.
   * `redirectPath` is where the confirmation link lands (e.g. back to the activation screen).
   */
  async signUp({ name, email, phone, password }: SignUpData, redirectPath = '/dashboard'): Promise<boolean> {
    setRememberSession(true);
    const { data, error } = await this.db.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { name: name.trim(), phone: phone.trim() },
        emailRedirectTo: `${location.origin}${redirectPath}`,
      },
    });
    if (error) throw error;
    return data.session !== null;
  }

  async signIn(email: string, password: string, remember: boolean): Promise<void> {
    setRememberSession(remember);
    const { error } = await this.db.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
  }

  async signOut(): Promise<void> {
    await this.injector
      .get(PushService)
      .disable()
      .catch(() => undefined);
    await this.db.auth.signOut();
  }

  async sendPasswordReset(email: string): Promise<void> {
    const { error } = await this.db.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${location.origin}/reset-password`,
    });
    if (error) throw error;
  }

  async updatePassword(password: string): Promise<void> {
    const { error } = await this.db.auth.updateUser({ password });
    if (error) throw error;
  }
}

/** Only same-app paths are accepted as post-login destinations. */
export const safeReturnUrl = (url: string | null | undefined, fallback = '/dashboard') =>
  url && url.startsWith('/') && !url.startsWith('//') ? url : fallback;
