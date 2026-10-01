import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
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
      <!-- Mobile: top bar with a hamburger that drops down the menu -->
      <header class="no-print sticky top-0 z-30 border-b border-slate-900/5 bg-white lg:hidden">
        <div class="flex items-center justify-between px-4 py-3">
          <div class="flex items-center gap-2">
            <app-logo />
            <span class="rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Admin</span>
          </div>
          <button type="button" class="grid size-10 place-items-center rounded-xl text-ink hover:bg-slate-100"
            [attr.aria-label]="menuOpen() ? 'Cerrar menú' : 'Abrir menú'" [attr.aria-expanded]="menuOpen()" (click)="menuOpen.set(!menuOpen())">
            <app-icon [name]="menuOpen() ? 'x' : 'menu'" class="size-6" />
          </button>
        </div>
        @if (menuOpen()) {
          <div class="absolute inset-x-0 top-full h-dvh bg-slate-900/30" (click)="menuOpen.set(false)"></div>
          <div class="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-slate-900/5 bg-white px-4 pb-4 pt-2 shadow-lg">
            <app-admin-sidebar />
            <div class="mt-3 space-y-1 border-t border-slate-100 pt-3">
              <p class="truncate px-3 pb-1 text-xs text-muted">{{ auth.profile()?.email }}</p>
              <a routerLink="/dashboard" class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                <app-icon name="paw" class="size-4" /> Mis mascotas
              </a>
              <button type="button" class="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100" (click)="signOut()">
                <app-icon name="logout" class="size-4" /> Salir
              </button>
            </div>
          </div>
        }
      </header>

      <aside class="no-print hidden border-r border-slate-900/5 bg-white px-4 py-5 lg:sticky lg:top-0 lg:block lg:h-dvh lg:w-60 lg:shrink-0">
        <div class="mb-6 flex items-center gap-2">
          <app-logo />
          <span class="rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Admin</span>
        </div>
        <app-admin-sidebar />
        <div class="mt-6 space-y-1 border-t border-slate-100 pt-4">
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

  protected readonly menuOpen = signal(false);

  constructor() {
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => this.menuOpen.set(false));
  }

  async signOut() {
    await this.auth.signOut();
    await this.router.navigateByUrl('/');
  }
}
