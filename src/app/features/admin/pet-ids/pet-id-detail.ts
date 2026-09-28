import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminRepository } from '../../../core/data/admin.repository';
import { PET_ID_STATUS_LABELS, PetIdRecord, PetIdStatus, SPECIES_LABELS, allowedPetIdTransitions } from '../../../core/models';
import { Icon, IconName } from '../../../shared/ui/icon';
import { PetIdStatusBadge } from '../../../shared/ui/pet-id-status-badge';
import { QrCard } from '../../../shared/ui/qr-card';

const ACTIONS: Record<PetIdStatus, { label: string; icon: IconName }> = {
  available: { label: 'Volver a disponible', icon: 'tag' },
  reserved: { label: 'Reservar', icon: 'bag' },
  sold: { label: 'Marcar como vendida', icon: 'bag' },
  activated: { label: 'Desbloquear', icon: 'check' },
  blocked: { label: 'Bloquear', icon: 'lock' },
};

@Component({
  selector: 'app-pet-id-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, Icon, PetIdStatusBadge, QrCard],
  template: `
    <a routerLink="/admin/petids" class="btn btn-ghost btn-sm -ml-3 mb-2">
      <app-icon name="arrow-left" class="size-4" /> PetIDs
    </a>

    @if (item(); as item) {
      @if (created()) {
        <div class="alert-success mb-6 flex items-center gap-3">
          <app-icon name="check" class="size-5" />
          <span><strong>PetID creada correctamente.</strong> Descarga o imprime el QR para fabricar el collar.</span>
        </div>
      }

      <div class="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <div>
          <app-qr-card [code]="item.code" [qrToken]="item.qrToken" [warnTemporaryUrl]="true" />
        </div>

        <div class="space-y-6">
          <section class="card p-5">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-muted">Código</p>
                <h1 class="text-3xl font-extrabold tracking-wider">{{ item.code }}</h1>
              </div>
              <app-pet-id-status-badge [status]="item.status" />
            </div>

            <dl class="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div class="rounded-2xl bg-surface px-3 py-2">
                <dt class="text-xs text-muted">Token QR</dt>
                <dd class="font-mono">{{ item.qrToken }}</dd>
              </div>
              <div class="rounded-2xl bg-surface px-3 py-2">
                <dt class="text-xs text-muted">Creada</dt>
                <dd class="font-medium">{{ item.createdAt | date: 'dd/MM/yyyy HH:mm' }}</dd>
              </div>
              <div class="rounded-2xl bg-surface px-3 py-2">
                <dt class="text-xs text-muted">Vendida</dt>
                <dd class="font-medium">{{ item.soldAt ? (item.soldAt | date: 'dd/MM/yyyy HH:mm') : '—' }}</dd>
              </div>
              <div class="rounded-2xl bg-surface px-3 py-2">
                <dt class="text-xs text-muted">Activada</dt>
                <dd class="font-medium">{{ item.activatedAt ? (item.activatedAt | date: 'dd/MM/yyyy HH:mm') : '—' }}</dd>
              </div>
              @if (item.notes) {
                <div class="rounded-2xl bg-surface px-3 py-2 sm:col-span-2">
                  <dt class="text-xs text-muted">Nota interna</dt>
                  <dd class="font-medium">{{ item.notes }}</dd>
                </div>
              }
            </dl>

            @if (actions().length) {
              <div class="mt-5 border-t border-slate-100 pt-4">
                <p class="text-sm font-semibold">Cambiar estado</p>
                <div class="mt-2 flex flex-wrap gap-2">
                  @for (a of actions(); track a.status) {
                    <button type="button" class="btn btn-sm" [class]="a.status === 'blocked' ? 'btn-ghost text-red-600 hover:bg-red-50' : 'btn-secondary'"
                      [disabled]="busy()" (click)="setStatus(a.status)">
                      <app-icon [name]="a.icon" class="size-4" /> {{ a.label }}
                    </button>
                  }
                </div>
                @if (item.status === 'available' || item.status === 'reserved' || item.status === 'sold') {
                  <p class="mt-3 text-xs text-muted">"Activada" no se asigna a mano: ocurre cuando el comprador escanea el QR y registra a su mascota.</p>
                }
              </div>
            }
            @if (actionError()) {
              <p class="alert-error mt-3">{{ actionError() }}</p>
            }
          </section>

          <section class="card p-5">
            <h2 class="font-bold">Vinculación</h2>
            @if (item.pet && item.owner) {
              <div class="mt-3 flex items-center gap-4">
                <span class="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-brand-50 text-2xl">
                  @if (item.pet.photoUrl) {
                    <img [src]="item.pet.photoUrl" [alt]="item.pet.name" class="size-full object-cover" />
                  } @else {
                    🐾
                  }
                </span>
                <div class="min-w-0 text-sm">
                  <p class="text-lg font-bold">{{ item.pet.name }} <span class="text-sm font-normal text-muted">· {{ speciesLabels[item.pet.species] }}</span></p>
                  <p>{{ item.owner.name }}</p>
                  <p class="truncate text-muted">{{ item.owner.email }}{{ item.owner.phone ? ' · ' + item.owner.phone : '' }}</p>
                </div>
              </div>
              <a [routerLink]="['/p', item.qrToken]" target="_blank" class="btn btn-secondary btn-sm mt-4">
                <app-icon name="external-link" class="size-4" /> Ver perfil público
              </a>
            } @else {
              <p class="mt-2 text-sm text-muted">
                Sin mascota ni propietario. Se vinculan automáticamente cuando el comprador escanea el QR, crea su cuenta y
                registra a su mascota.
              </p>
            }
          </section>
        </div>
      </div>
    } @else if (error()) {
      <p class="alert-error">{{ error() }}</p>
    } @else {
      <div class="card h-96 animate-pulse bg-white/60"></div>
    }
  `,
})
export class PetIdDetail implements OnInit {
  private readonly repo = inject(AdminRepository);

  readonly id = input.required<string>();
  /** Query param set right after generating a single PetID. */
  readonly created = input<string>();

  protected readonly speciesLabels = SPECIES_LABELS;
  protected readonly item = signal<PetIdRecord | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected readonly actions = computed(() => {
    const item = this.item();
    if (!item) return [];
    return allowedPetIdTransitions(item.status, !!item.pet).map((status) => ({ status, ...ACTIONS[status] }));
  });

  async ngOnInit() {
    try {
      this.item.set(await this.repo.getPetId(this.id()));
    } catch {
      this.error.set('No encontramos esta PetID.');
    }
  }

  async setStatus(status: PetIdStatus) {
    const item = this.item()!;
    if (status === 'blocked' && !confirm(`¿Bloquear ${item.code}? Su QR dejará de mostrar el perfil y no podrá activarse.`)) return;
    this.busy.set(true);
    this.actionError.set(null);
    try {
      await this.repo.setPetIdStatus(item.id, status);
      this.item.set(await this.repo.getPetId(item.id));
    } catch {
      this.actionError.set(`No pudimos cambiar el estado a ${PET_ID_STATUS_LABELS[status].toLowerCase()}.`);
    } finally {
      this.busy.set(false);
    }
  }
}
