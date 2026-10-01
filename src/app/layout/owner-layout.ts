import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SwPush } from '@angular/service-worker';
import { filter } from 'rxjs';
import { AuthService } from '../core/auth/auth.service';
import { NotificationsService } from '../core/notifications/notifications.service';
import { Icon } from '../shared/ui/icon';
import { Logo } from '../shared/ui/logo';

@Component({
  selector: 'app-owner-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Logo, Icon],
  template: `
    <header class="no-print sticky top-0 z-20 border-b border-slate-900/5 bg-surface/85 backdrop-blur">
      <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <app-logo />
        <nav class="flex items-center gap-1">
          <a routerLink="/dashboard" class="btn btn-ghost btn-sm">Mis mascotas</a>
          <a routerLink="/avisos" routerLinkActive="bg-brand-50 text-brand-700" class="btn btn-ghost btn-sm relative" [attr.aria-label]="bellLabel()">
            <app-icon name="bell" class="size-5" />
            @if (notifications.unseen(); as count) {
              <span class="absolute -right-0.5 -top-0.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-surface">
                {{ count > 9 ? '9+' : count }}
              </span>
            }
          </a>
          @if (auth.isAdmin()) {
            <a routerLink="/admin" class="btn btn-ghost btn-sm">
              <app-icon name="dashboard" class="size-4" />
              <span class="hidden sm:inline">Admin</span>
            </a>
          }
          <button type="button" class="btn btn-ghost btn-sm" (click)="signOut()" aria-label="Cerrar sesión">
            <app-icon name="logout" class="size-4" />
            <span class="hidden sm:inline">Salir</span>
          </button>
        </nav>
      </div>
    </header>
    <main class="mx-auto max-w-5xl px-4 pb-16 pt-6">
      <router-outlet />
    </main>
  `,
})
export class OwnerLayout {
  protected readonly auth = inject(AuthService);
  protected readonly notifications = inject(NotificationsService);
  private readonly router = inject(Router);

  protected readonly bellLabel = computed(() => {
    const count = this.notifications.unseen();
    return count ? `Avisos: ${count} sin ver` : 'Avisos';
  });

  constructor() {
    const refresh = () => this.notifications.refresh();
    // Also covers the navigation that created this layout: NavigationEnd comes after activation.
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed()).subscribe(refresh);
    // A push that arrives while the app is open (only when the service worker is active).
    const swPush = inject(SwPush);
    if (swPush.isEnabled) swPush.messages.pipe(takeUntilDestroyed()).subscribe(refresh);

    this.notifications.listen();

    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('visibilitychange', onVisible);
      this.notifications.stop();
    });
  }

  async signOut() {
    await this.auth.signOut();
    await this.router.navigateByUrl('/');
  }
}
