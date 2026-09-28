import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { rememberAwareStorage } from './remember-storage';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly configured = Boolean(environment.supabaseUrl && environment.supabaseAnonKey);

  readonly client: SupabaseClient = createClient(
    environment.supabaseUrl || 'http://localhost:54321',
    environment.supabaseAnonKey || 'not-configured',
    {
      auth: {
        storage: rememberAwareStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    },
  );
}
