import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { AdminReportRow, AdminRepository } from '../../../core/data/admin.repository';
import { FoundReportStatus } from '../../../core/models';
import { AdminTable } from '../ui/admin-table';

const STATUS: Record<FoundReportStatus, { label: string; css: string }> = {
  new: { label: 'Nuevo', css: 'bg-red-100 text-red-700' },
  read: { label: 'Visto por el dueño', css: 'bg-slate-100 text-slate-700' },
  resolved: { label: 'Resuelto', css: 'bg-brand-100 text-brand-800' },
};

@Component({
  selector: 'app-admin-reports',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, AdminTable],
  template: `
    <h1 class="page-title">Reportes</h1>
    <p class="mt-1 text-muted">Avisos de "Encontré esta mascota" enviados desde los perfiles públicos.</p>

    <app-admin-table class="mt-6" [loading]="loading()" [error]="error()" [empty]="!items().length" emptyText="Aún no hay reportes.">
      <thead>
        <tr><th>Fecha</th><th>Mascota</th><th>PetID</th><th>Quién avisó</th><th>Mensaje</th><th>Estado</th></tr>
      </thead>
      <tbody>
        @for (r of items(); track r.id) {
          <tr>
            <td class="whitespace-nowrap text-muted max-sm:text-xs">{{ r.createdAt | date: 'dd/MM/yy HH:mm' }}</td>
            <td class="cell-main font-semibold">{{ r.petName ?? '—' }}</td>
            <td class="tracking-wider max-sm:text-xs">{{ r.petIdCode ?? '—' }}</td>
            <td class="cell-full">
              <span class="block">{{ r.reporterName || 'Anónimo' }}</span>
              <span class="block text-xs text-muted">{{ r.reporterPhone || 'Sin teléfono' }}</span>
            </td>
            <td class="cell-full max-w-xs"><p class="line-clamp-2 text-muted">{{ r.message ?? '—' }}</p></td>
            <td class="cell-corner"><span class="whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold" [class]="status[r.status].css">{{ status[r.status].label }}</span></td>
          </tr>
        }
      </tbody>
    </app-admin-table>
  `,
})
export class AdminReports implements OnInit {
  private readonly repo = inject(AdminRepository);

  protected readonly status = STATUS;
  protected readonly items = signal<AdminReportRow[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  async ngOnInit() {
    try {
      this.items.set(await this.repo.listReports());
    } catch {
      this.error.set('No pudimos cargar los reportes.');
    } finally {
      this.loading.set(false);
    }
  }
}
