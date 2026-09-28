import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SupabaseService } from './core/supabase/supabase.service';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  template: `
    @if (!configured) {
      <div class="no-print bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
        Supabase no está configurado: completa <code>supabaseUrl</code> y <code>supabaseAnonKey</code> en
        <code>src/environments</code> (ver README).
      </div>
    }
    <router-outlet />
  `,
})
export class App {
  protected readonly configured = inject(SupabaseService).configured;
}
