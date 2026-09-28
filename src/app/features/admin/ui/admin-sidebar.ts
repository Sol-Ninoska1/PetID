import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Icon, IconName } from '../../../shared/ui/icon';

export const ADMIN_MENU: { label: string; path: string; icon: IconName; exact?: boolean }[] = [
  { label: 'Dashboard', path: '/admin', icon: 'dashboard', exact: true },
  { label: 'PetIDs', path: '/admin/petids', icon: 'qr' },
  { label: 'Productos', path: '/admin/products', icon: 'package' },
  { label: 'Activaciones', path: '/admin/activations', icon: 'sparkles' },
  { label: 'Mascotas', path: '/admin/pets', icon: 'paw' },
  { label: 'Usuarios', path: '/admin/users', icon: 'users' },
  { label: 'Reportes', path: '/admin/reports', icon: 'flag' },
  { label: 'Configuración', path: '/admin/settings', icon: 'settings' },
];

/** Vertical menu on desktop, horizontal scrollable chips on mobile. */
@Component({
  selector: 'app-admin-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, Icon],
  template: `
    <nav aria-label="Administración" class="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
      @for (item of menu; track item.path) {
        <a [routerLink]="item.path" routerLinkActive="bg-brand-600 !text-white shadow-sm" [routerLinkActiveOptions]="{ exact: !!item.exact }"
          class="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-ink">
          <app-icon [name]="item.icon" class="size-4" />
          {{ item.label }}
        </a>
      }
    </nav>
  `,
})
export class AdminSidebar {
  protected readonly menu = ADMIN_MENU;
}
