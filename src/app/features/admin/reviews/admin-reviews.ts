import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FeedbackRepository } from '../../../core/data/feedback.repository';
import { AdminReview } from '../../../core/models';
import { StarRating } from '../../../shared/ui/star-rating';
import { AdminTable } from '../ui/admin-table';

@Component({
  selector: 'app-admin-reviews',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, AdminTable, StarRating],
  template: `
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="page-title">Reseñas</h1>
        <p class="mt-1 text-muted">Opiniones de clientes con mascota registrada. Las ocultas no se muestran en la landing.</p>
      </div>
      @if (items().length) {
        <div class="flex items-center gap-2 rounded-xl bg-white px-4 py-2 shadow-sm ring-1 ring-slate-200">
          <span class="text-2xl font-bold">{{ averageText() }}</span>
          <app-star-rating [value]="average()" starClass="size-4" />
          <span class="text-sm text-muted">· {{ visibleCount() }} públicas</span>
        </div>
      }
    </div>

    @if (actionError()) { <p class="alert-error mt-4" role="alert">{{ actionError() }}</p> }

    <app-admin-table class="mt-6" [loading]="loading()" [error]="error()" [empty]="!items().length" emptyText="Aún no hay reseñas.">
      <thead>
        <tr><th>Fecha</th><th>Cliente</th><th>Estrellas</th><th>Comentario</th><th>Estado</th><th></th></tr>
      </thead>
      <tbody>
        @for (r of items(); track r.id) {
          <tr class="align-top" [class.opacity-60]="r.isHidden">
            <td class="whitespace-nowrap text-muted">{{ r.createdAt | date: 'dd/MM/yy' }}</td>
            <td>
              <span class="block font-semibold">{{ r.authorName }}</span>
              @if (r.authorEmail) { <a class="block text-xs text-brand-700 hover:underline" [href]="'mailto:' + r.authorEmail">{{ r.authorEmail }}</a> }
            </td>
            <td><app-star-rating [value]="r.rating" starClass="size-4" /></td>
            <td class="min-w-64 max-w-md"><p class="whitespace-pre-line text-muted">{{ r.comment || '—' }}</p></td>
            <td>
              <span class="whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold" [class]="r.isHidden ? 'bg-slate-100 text-slate-600' : 'bg-brand-100 text-brand-800'">
                {{ r.isHidden ? 'Oculta' : 'Pública' }}
              </span>
            </td>
            <td class="text-right">
              <button type="button" class="btn btn-ghost btn-sm whitespace-nowrap" [disabled]="busy() === r.id" (click)="toggle(r)">
                {{ r.isHidden ? 'Mostrar' : 'Ocultar' }}
              </button>
            </td>
          </tr>
        }
      </tbody>
    </app-admin-table>
  `,
})
export class AdminReviews implements OnInit {
  private readonly repo = inject(FeedbackRepository);

  protected readonly items = signal<AdminReview[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly busy = signal<string | null>(null);

  private readonly publicReviews = computed(() => this.items().filter((r) => !r.isHidden));
  protected readonly visibleCount = computed(() => this.publicReviews().length);
  protected readonly average = computed(() => {
    const list = this.publicReviews();
    return list.length ? list.reduce((sum, r) => sum + r.rating, 0) / list.length : 0;
  });
  protected readonly averageText = computed(() => this.average().toFixed(1).replace('.', ','));

  async ngOnInit() {
    try {
      this.items.set(await this.repo.listReviews());
    } catch {
      this.error.set('No pudimos cargar las reseñas.');
    } finally {
      this.loading.set(false);
    }
  }

  protected async toggle(r: AdminReview) {
    this.busy.set(r.id);
    this.actionError.set(null);
    try {
      await this.repo.setReviewHidden(r.id, !r.isHidden);
      this.items.update((list) => list.map((x) => (x.id === r.id ? { ...x, isHidden: !r.isHidden } : x)));
    } catch {
      this.actionError.set('No pudimos actualizar la reseña.');
    } finally {
      this.busy.set(null);
    }
  }
}
