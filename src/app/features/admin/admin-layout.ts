import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { Icon } from '../../shared/ui/icon';
import { Logo } from '../../shared/ui/logo';
import { AdminSidebar } from './ui/admin-sidebar';

@Component({
  selector: 'app-admin-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, Logo, Icon, AdminSidebar],
  template: `
    <div class="lg:flex">
      <aside class="no-print border-b border-slate-900/5 bg-white px-4 pb-3 pt-3 lg:sticky lg:top-0 lg:h-dvh lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r lg:px-4 lg:py-5">
        <div class="mb-3 flex items-center justify-between lg:mb-6 lg:block">
          <div class="flex items-center gap-2">
            <app-logo />
            <span class="rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Admin</span>
          </div>
          <div class="flex items-center gap-1 lg:hidden">
            <a routerLink="/dashboard" class="btn btn-ghost btn-sm" aria-label="Mis mascotas"><app-icon name="paw" class="size-4" /></a>
            <button type="button" class="btn btn-ghost btn-sm" (click)="signOut()" aria-label="Cerrar sesión"><app-icon name="logout" class="size-4" /></button>
          </div>
        </div>
        <app-admin-sidebar />
        <div class="mt-6 hidden space-y-1 border-t border-slate-100 pt-4 lg:block">
          <p class="truncate px-3 text-xs text-muted">{{ auth.profile()?.email }}</p>
          <a routerLink="/dashboard" class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
            <app-icon name="paw" class="size-4" /> Mis mascotas
          </a>
          <button type="button" class="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100" (click)="signOut()">
            <app-icon name="logout" class="size-4" /> Salir
          </button>
        </div>
      </aside>
      <main class="min-w-0 flex-1 px-4 pb-16 pt-6 lg:px-8">
        <div class="mx-auto max-w-6xl">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
})
export class AdminLayout {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  async signOut() {
    await this.auth.signOut();
    await this.router.navigateByUrl('/');
  }
}
