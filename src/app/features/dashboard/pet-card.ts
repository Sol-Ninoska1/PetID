import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  isPlanExpired,
  PetWithStats,
  planDaysLeft,
  RENEWAL_NOTICE_DAYS,
  SPECIES_EMOJI,
  SPECIES_LABELS,
} from '../../core/models';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';
import { Icon } from '../../shared/ui/icon';
import { PetStatusBadge } from '../../shared/ui/pet-status-badge';

/** Owner dashboard card: the pet plus the PetID (collar) it's linked to. */
@Component({
  selector: 'app-pet-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, Icon, PetStatusBadge, RelativeTimePipe],
  template: `
    @if (pet(); as pet) {
    <article class="card overflow-hidden" [class.ring-2]="pet.isLost" [class.ring-red-400]="pet.isLost" [class.ring-brand-400]="highlight() && !pet.isLost">
      <!-- Mobile: compact row so the photo doesn't fill the whole screen -->
      <div class="flex gap-4 p-4 pb-0 sm:hidden">
        <div class="size-24 shrink-0 overflow-hidden rounded-2xl bg-brand-50 ring-1 ring-slate-900/5">
          @if (pet.photoUrl) {
            <img [src]="pet.photoUrl" [alt]="pet.name" class="size-full object-cover" loading="lazy" />
          } @else {
            <div class="grid size-full place-items-center text-4xl">{{ speciesEmoji[pet.species] }}</div>
          }
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-1.5">
            <app-pet-status-badge [isLost]="pet.isLost" [isActive]="pet.isActive" />
            @if (pet.petId; as petId) {
              <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold tracking-wider text-ink">{{ petId.code }}</span>
            }
          </div>
          <h3 class="mt-1.5 truncate text-lg font-bold">{{ pet.name }}</h3>
          <p class="truncate text-sm text-muted">{{ speciesLabels[pet.species] }}{{ pet.breed ? ' · ' + pet.breed : '' }}</p>
          <a [routerLink]="['/pets', pet.id, 'activity']" class="mt-1.5 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            <app-icon name="activity" class="size-3.5" />
            {{ pet.scanCount }} {{ pet.scanCount === 1 ? 'escaneo' : 'escaneos' }}
          </a>
        </div>
      </div>

      <div class="relative hidden aspect-square bg-brand-50 sm:block">
        @if (pet.photoUrl) {
          <img [src]="pet.photoUrl" [alt]="pet.name" class="size-full object-cover" loading="lazy" />
        } @else {
          <div class="grid size-full place-items-center text-6xl">{{ speciesEmoji[pet.species] }}</div>
        }
        <app-pet-status-badge class="absolute left-3 top-3" [isLost]="pet.isLost" [isActive]="pet.isActive" />
        @if (pet.petId; as petId) {
          <span class="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold tracking-wider text-ink shadow-sm">
            {{ petId.code }}
          </span>
        }
      </div>

      <div class="p-4">
        <div class="hidden items-start justify-between gap-2 sm:flex">
          <div class="min-w-0">
            <h3 class="truncate text-lg font-bold">{{ pet.name }}</h3>
            <p class="text-sm text-muted">{{ speciesLabels[pet.species] }}{{ pet.breed ? ' · ' + pet.breed : '' }}</p>
          </div>
          <a [routerLink]="['/pets', pet.id, 'activity']" class="flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200">
            <app-icon name="activity" class="size-3.5" />
            {{ pet.scanCount }} {{ pet.scanCount === 1 ? 'escaneo' : 'escaneos' }}
          </a>
        </div>
        <p class="text-xs text-muted sm:mt-2">
          {{ pet.lastScanAt ? 'Último escaneo ' + (pet.lastScanAt | relativeTime) : 'Aún no han escaneado su PetID' }}
        </p>

        @if (plan(); as plan) {
          @if (plan.expired) {
            <div class="mt-3 rounded-2xl bg-red-50 p-3 text-sm ring-1 ring-red-200">
              <p class="font-semibold text-red-700">Plan vencido el {{ plan.expiresAt | date: 'dd/MM/yyyy' }}</p>
              <p class="mt-0.5 text-red-900/80">Su placa muestra solo lo básico, no recibes avisos y no puedes editar su perfil.</p>
            </div>
          } @else if (plan.daysLeft <= renewalNoticeDays) {
            <div class="mt-3 rounded-2xl bg-amber-50 p-3 text-sm ring-1 ring-amber-200">
              <p class="font-semibold text-amber-900">
                Su plan vence {{ plan.daysLeft === 1 ? 'mañana' : 'en ' + plan.daysLeft + ' días' }}
                <span class="font-normal">({{ plan.expiresAt | date: 'dd/MM/yyyy' }})</span>
              </p>
              <p class="mt-0.5 text-amber-900/80">Renuévalo para seguir recibiendo avisos y editando su perfil.</p>
            </div>
          } @else {
            <p class="mt-1 text-xs text-muted">Plan activo hasta el {{ plan.expiresAt | date: 'dd/MM/yyyy' }}</p>
          }
        }

        <div class="mt-4 grid grid-cols-2 gap-2">
          @if (pet.petId; as petId) {
            <a [routerLink]="['/p', petId.qrToken]" target="_blank" class="btn btn-secondary btn-sm">
              <app-icon name="eye" class="size-4" /> Ver perfil
            </a>
          }
          @if (plan()?.expired) {
            <a routerLink="/" [queryParams]="{ renovar: pet.petId?.code }" fragment="soporte" class="btn btn-primary btn-sm">
              <app-icon name="sparkles" class="size-4" /> Renovar
            </a>
          } @else {
            <a [routerLink]="['/pets', pet.id, 'edit']" class="btn btn-secondary btn-sm">
              <app-icon name="edit" class="size-4" /> Editar
            </a>
          }
        </div>
        @if (plan(); as plan) {
          @if (!plan.expired && plan.daysLeft <= renewalNoticeDays) {
            <a routerLink="/" [queryParams]="{ renovar: pet.petId?.code }" fragment="soporte" class="btn btn-primary btn-sm mt-2 w-full">
              <app-icon name="sparkles" class="size-4" /> Renovar un año más
            </a>
          }
        }

        <button type="button" class="btn btn-sm mt-2 w-full"
          [class]="pet.isLost ? 'btn-primary' : 'btn-danger'"
          [disabled]="busy() || !pet.isActive"
          (click)="toggleLost.emit()">
          <app-icon [name]="pet.isLost ? 'check' : 'alert'" class="size-4" />
          {{ pet.isLost ? 'Ya la encontré' : 'Marcar como perdida' }}
        </button>

        <div class="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-sm">
          <a [routerLink]="['/pets', pet.id, 'qr']" class="inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:underline">
            <app-icon name="qr" class="size-4" /> Mi PetID y QR
          </a>
          <a [routerLink]="['/pets', pet.id, 'activity']" class="inline-flex items-center gap-1.5 text-muted hover:text-ink">
            <app-icon name="flag" class="size-4" /> Reportes
          </a>
        </div>
        <button type="button" class="mt-2 inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink" [disabled]="busy()" (click)="toggleActive.emit()">
          <app-icon name="power" class="size-3.5" />
          {{ pet.isActive ? 'Pausar perfil público' : 'Reactivar perfil público' }}
        </button>
      </div>
    </article>
    }
  `,
})
export class PetCard {
  readonly pet = input.required<PetWithStats>();
  readonly busy = input(false);
  readonly highlight = input(false);
  readonly toggleLost = output<void>();
  readonly toggleActive = output<void>();

  protected readonly speciesLabels = SPECIES_LABELS;
  protected readonly speciesEmoji = SPECIES_EMOJI;
  protected readonly renewalNoticeDays = RENEWAL_NOTICE_DAYS;

  /** Null when the PetID never expires (demo). */
  protected readonly plan = computed(() => {
    const expiresAt = this.pet().petId?.expiresAt ?? null;
    const daysLeft = planDaysLeft(expiresAt);
    return expiresAt && daysLeft !== null ? { expiresAt, daysLeft, expired: isPlanExpired(expiresAt) } : null;
  });
}
