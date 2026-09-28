import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { AdminRepository, AdminUserRow } from '../../../core/data/admin.repository';
import { AdminTable } from '../ui/admin-table';

@Component({
  selector: 'app-admin-users',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, AdminTable],
  template: `
    <h1 class="page-title">Usuarios</h1>
    <p class="mt-1 text-muted">Cuentas creadas en PetID. Los administradores se asignan desde Supabase (ver README).</p>

    <app-admin-table class="mt-6" [loading]="loading()" [error]="error()" [empty]="!items().length" emptyText="Aún no hay usuarios.">
      <thead>
        <tr><th>Nombre</th><th>Email</th><th>Teléfono</th><th>Rol</th><th>Mascotas</th><th>Alta</th></tr>
      </thead>
      <tbody>
        @for (user of items(); track user.id) {
          <tr>
            <td class="font-semibold">{{ user.name }}</td>
            <td>{{ user.email }}</td>
            <td class="whitespace-nowrap">{{ user.phone ?? '—' }}</td>
            <td>
              <span class="rounded-full px-2.5 py-1 text-xs font-bold" [class]="user.role === 'admin' ? 'bg-ink text-white' : 'bg-slate-100 text-slate-700'">
                {{ user.role === 'admin' ? 'Admin' : 'Cliente' }}
              </span>
            </td>
            <td>{{ user.petCount }}</td>
            <td class="whitespace-nowrap text-muted">{{ user.createdAt | date: 'dd/MM/yy' }}</td>
          </tr>
        }
      </tbody>
    </app-admin-table>
  `,
})
export class AdminUsers implements OnInit {
  private readonly repo = inject(AdminRepository);

  protected readonly items = signal<AdminUserRow[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  async ngOnInit() {
    try {
      this.items.set(await this.repo.listUsers());
    } catch {
      this.error.set('No pudimos cargar los usuarios.');
    } finally {
      this.loading.set(false);
    }
  }
}
