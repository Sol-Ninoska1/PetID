import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminRepository, AdminStats } from '../../../core/data/admin.repository';
import { PET_ID_STATUS_LABELS, PetIdRecord } from '../../../core/models';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';
import { Icon, IconName } from '../../../shared/ui/icon';

@Component({
  selector: 'app-admin-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, RelativeTimePipe],
  template: `
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="mt-1 text-muted">Resumen de PetIDs, activaciones y actividad.</p>
      </div>
      <a routerLink="/admin/petids" [queryParams]="{ generate: 1 }" class="btn btn-primary">
        <app-icon name="plus" class="size-5" /> Generar nueva PetID
      </a>
    </div>

    @if (error()) {
      <p class="alert-error mt-6">{{ error() }}</p>
    }

    <section class="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="PetIDs por estado">
      @for (card of petIdCards(); track card.label) {
        <a [routerLink]="'/admin/petids'" [queryParams]="{ status: card.status }" class="card p-4 transition hover:ring-brand-200">
          <p class="text-xs font-semibold uppercase tracking-wide text-muted">{{ card.label }}</p>
          <p class="mt-1 text-3xl font-extrabold">{{ loading() ? '–' : card.value }}</p>
        </a>
      }
    </section>

    <section class="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Actividad">
      @for (card of activityCards(); track card.label) {
        <a [routerLink]="card.link" class="card flex items-center gap-3 p-4 transition hover:ring-brand-200">
          <span class="grid size-10 shrink-0 place-items-center rounded-xl" [class]="card.css">
            <app-icon [name]="card.icon" class="size-5" />
          </span>
          <div class="min-w-0">
            <p class="truncate text-xs text-muted">{{ card.label }}</p>
            <p class="text-xl font-bold">{{ loading() ? '–' : card.value }}</p>
          </div>
        </a>
      }
    </section>

    <section class="card mt-6 p-5">
      <div class="flex items-center justify-between">
        <h2 class="font-bold">Últimas activaciones</h2>
        <a routerLink="/admin/activations" class="text-sm font-semibold text-brand-700 hover:underline">Ver todas</a>
      </div>
      @if (!loading() && !recent().length) {
        <p class="mt-4 text-sm text-muted">Aún no hay PetIDs activadas.</p>
      }
      <ul class="mt-2 divide-y divide-slate-100">
        @for (item of recent(); track item.id) {
          <li class="flex items-center gap-3 py-3">
            <span class="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-50">
              @if (item.pet?.photoUrl) {
                <img [src]="item.pet!.photoUrl" alt="" class="size-full object-cover" />
              } @else {
                🐾
              }
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold">{{ item.pet?.name ?? '—' }} <span class="font-normal text-muted">· {{ item.owner?.name ?? '—' }}</span></p>
              <p class="text-xs text-muted">{{ item.code }} · {{ item.activatedAt | relativeTime }}</p>
            </div>
            <a [routerLink]="['/admin/petids', item.id]" class="btn btn-ghost btn-sm" [attr.aria-label]="'Ver ' + item.code">
              <app-icon name="chevron-right" class="size-4" />
            </a>
          </li>
        }
      </ul>
    </section>
  `,
})
export class AdminDashboard implements OnInit {
  private readonly repo = inject(AdminRepository);

  protected readonly stats = signal<AdminStats | null>(null);
  protected readonly recent = signal<PetIdRecord[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly petIdCards = computed(() => {
    const s = this.stats();
    return (['available', 'reserved', 'sold', 'activated', 'blocked'] as const).map((status) => ({
      status,
      label: PET_ID_STATUS_LABELS[status],
      value: s?.petIds[status] ?? 0,
    }));
  });

  protected readonly activityCards = computed(() => {
    const s = this.stats();
    return [
      { label: 'Mascotas registradas', value: s?.pets ?? 0, icon: 'paw', link: '/admin/pets', css: 'bg-brand-50 text-brand-700' },
      { label: 'Mascotas perdidas', value: s?.lostPets ?? 0, icon: 'alert', link: '/admin/pets', css: 'bg-red-50 text-red-600' },
      { label: 'Reportes nuevos', value: s?.newReports ?? 0, icon: 'flag', link: '/admin/reports', css: 'bg-amber-50 text-amber-700' },
      { label: 'Escaneos (7 días)', value: s?.scansLast7Days ?? 0, icon: 'activity', link: '/admin/petids', css: 'bg-sky-50 text-sky-700' },
    ] satisfies { label: string; value: number; icon: IconName; link: string; css: string }[];
  });

  async ngOnInit() {
    try {
      const [stats, recent] = await Promise.all([
        this.repo.stats(),
        this.repo.listPetIds({ status: 'activated', orderBy: 'activated_at', limit: 5 }),
      ]);
      this.stats.set(stats);
      this.recent.set(recent);
    } catch {
      this.error.set('No pudimos cargar el resumen. ¿Tu usuario tiene rol admin y aplicaste la migración de PetIDs?');
    } finally {
      this.loading.set(false);
    }
  }
}
