import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminRepository } from '../../../core/data/admin.repository';
import { PetIdRecord } from '../../../core/models';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';
import { AdminTable } from '../ui/admin-table';

@Component({
  selector: 'app-admin-activations',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, RelativeTimePipe, AdminTable],
  template: `
    <h1 class="page-title">Activaciones</h1>
    <p class="mt-1 text-muted">PetIDs que sus compradores ya vincularon a una mascota, de la más reciente a la más antigua.</p>

    <app-admin-table class="mt-6" [loading]="loading()" [error]="error()" [empty]="!items().length" emptyText="Aún no hay activaciones.">
      <thead>
        <tr><th>Código</th><th>Mascota</th><th>Propietario</th><th>Vendida</th><th>Activada</th></tr>
      </thead>
      <tbody>
        @for (item of items(); track item.id) {
          <tr>
            <td class="font-bold tracking-wider"><a [routerLink]="['/admin/petids', item.id]" class="hover:text-brand-700 hover:underline">{{ item.code }}</a></td>
            <td>{{ item.pet?.name ?? '—' }}</td>
            <td>
              <span class="block">{{ item.owner?.name ?? '—' }}</span>
              <span class="block text-xs text-muted">{{ item.owner?.email }}</span>
            </td>
            <td class="whitespace-nowrap text-muted">{{ item.soldAt ? (item.soldAt | date: 'dd/MM/yy') : '—' }}</td>
            <td class="whitespace-nowrap">
              <span class="block">{{ item.activatedAt | date: 'dd/MM/yy HH:mm' }}</span>
              <span class="block text-xs text-muted">{{ item.activatedAt | relativeTime }}</span>
            </td>
          </tr>
        }
      </tbody>
    </app-admin-table>
  `,
})
export class AdminActivations implements OnInit {
  private readonly repo = inject(AdminRepository);

  protected readonly items = signal<PetIdRecord[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  async ngOnInit() {
    try {
      this.items.set(await this.repo.listPetIds({ status: 'activated', orderBy: 'activated_at' }));
    } catch {
      this.error.set('No pudimos cargar las activaciones.');
    } finally {
      this.loading.set(false);
    }
  }
}
