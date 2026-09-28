import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { Icon } from '../shared/ui/icon';
import { Logo } from '../shared/ui/logo';

@Component({
  selector: 'app-owner-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, Logo, Icon],
  template: `
    <header class="no-print sticky top-0 z-20 border-b border-slate-900/5 bg-surface/85 backdrop-blur">
      <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <app-logo />
        <nav class="flex items-center gap-1">
          <a routerLink="/dashboard" class="btn btn-ghost btn-sm">Mis mascotas</a>
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
  private readonly router = inject(Router);

  async signOut() {
    await this.auth.signOut();
    await this.router.navigateByUrl('/');
  }
}
