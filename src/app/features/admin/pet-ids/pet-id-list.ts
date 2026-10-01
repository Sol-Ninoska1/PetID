import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AdminRepository } from '../../../core/data/admin.repository';
import { PET_ID_STATUS_LABELS, PET_ID_STATUSES, PetIdRecord, PetIdStatus, allowedPetIdTransitions } from '../../../core/models';
import { Icon } from '../../../shared/ui/icon';
import { PetIdStatusBadge } from '../../../shared/ui/pet-id-status-badge';
import {
  LABEL_FORMATS,
  LabelFormat,
  printLabels,
  publicPetIdUrl,
  saveLabelFormat,
  savedLabelFormat,
} from '../../../shared/utils/qr-label';
import { AdminTable } from '../ui/admin-table';
import { GeneratePetIdsForm } from './generate-pet-ids-form';

@Component({
  selector: 'app-pet-id-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, Icon, PetIdStatusBadge, AdminTable, GeneratePetIdsForm],
  template: `
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="page-title">PetIDs</h1>
        <p class="mt-1 text-muted">Identificadores físicos: se generan, se imprimen, se venden y el cliente los activa.</p>
      </div>
      <button type="button" class="btn btn-primary" (click)="showForm.set(!showForm())">
        <app-icon [name]="showForm() ? 'x' : 'plus'" class="size-5" /> {{ showForm() ? 'Cerrar' : 'Generar nueva PetID' }}
      </button>
    </div>

    @if (showForm()) {
      <app-generate-pet-ids-form class="mt-6 block" (created)="onCreated($event)" />
    }

    @if (justCreated().length > 1) {
      <div class="alert-success mt-6 flex flex-wrap items-center justify-between gap-3">
        <span><strong>Se generaron {{ justCreated().length }} PetIDs.</strong> Ya puedes imprimir sus QR para fabricar.</span>
        <div class="flex flex-wrap items-center gap-2">
          <select class="field-input w-auto py-1.5 text-sm" aria-label="Formato del QR" [value]="format()"
            (change)="setFormat($any($event.target).value)">
            @for (f of formats; track f.value) {
              <option [value]="f.value">{{ f.label }}</option>
            }
          </select>
          <button type="button" class="btn btn-primary btn-sm" (click)="printIds(justCreated())">
            <app-icon name="printer" class="size-4" /> Imprimir las {{ justCreated().length }}
          </button>
        </div>
      </div>
    }

    @if (actionError()) {
      <p class="alert-error mt-6" role="alert">{{ actionError() }}</p>
    }

    <app-admin-table class="mt-6" [loading]="loading()" [error]="error()" [empty]="!items().length"
      [emptyText]="status() || q() ? 'No hay PetIDs con ese filtro.' : 'Aún no hay PetIDs. Genera la primera.'">
      <div toolbar class="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="-mx-1 flex gap-1 overflow-x-auto px-1">
          <button type="button" class="btn btn-sm shrink-0" [class]="!status() ? 'bg-ink text-white' : 'btn-ghost'" (click)="setStatus(null)">Todas</button>
          @for (s of statuses; track s) {
            <button type="button" class="btn btn-sm shrink-0" [class]="status() === s ? 'bg-ink text-white' : 'btn-ghost'" (click)="setStatus(s)">
              {{ statusLabels[s] }}
            </button>
          }
        </div>
        <form class="relative lg:w-64" (submit)="search($event, searchInput.value)">
          <app-icon name="search" class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input #searchInput class="field-input py-2 pl-9 text-sm" placeholder="Buscar código (PET-00001)" [value]="q() ?? ''" aria-label="Buscar por código" />
        </form>
      </div>

      @if (selected().size) {
        <div toolbar class="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-brand-50/60 px-4 py-2 text-sm">
          <span class="font-semibold">{{ selected().size }} seleccionadas</span>
          <select class="field-input w-auto py-1.5 text-sm" aria-label="Formato del QR" [value]="format()"
            (change)="setFormat($any($event.target).value)">
            @for (f of formats; track f.value) {
              <option [value]="f.value">{{ f.label }}</option>
            }
          </select>
          <button type="button" class="btn btn-secondary btn-sm" (click)="printIds([...selected()])">
            <app-icon name="printer" class="size-4" /> Imprimir QR
          </button>
          @if (sellable().length) {
            <button type="button" class="btn btn-secondary btn-sm" [disabled]="busy()" (click)="markSold()">
              <app-icon name="bag" class="size-4" /> Marcar como vendidas ({{ sellable().length }})
            </button>
          }
          <button type="button" class="btn btn-ghost btn-sm" (click)="clearSelection()">Limpiar</button>
        </div>
      }

      <thead>
        <tr>
          <th class="w-10"><input type="checkbox" class="size-4 accent-brand-600" aria-label="Seleccionar todas" [checked]="allSelected()" (change)="toggleAll()" /></th>
          <th>Código</th>
          <th>Estado</th>
          <th>Mascota</th>
          <th>Propietario</th>
          <th>Creada</th>
          <th>Activada</th>
          <th class="text-right">Acciones</th>
        </tr>
      </thead>
      <tbody>
        @for (item of items(); track item.id) {
          <tr>
            <td><input type="checkbox" class="size-4 accent-brand-600" [attr.aria-label]="'Seleccionar ' + item.code" [checked]="selected().has(item.id)" (change)="toggle(item.id)" /></td>
            <td class="font-bold tracking-wider">
              <a [routerLink]="['/admin/petids', item.id]" class="hover:text-brand-700 hover:underline">{{ item.code }}</a>
            </td>
            <td><app-pet-id-status-badge [status]="item.status" /></td>
            <td>{{ item.pet?.name ?? '—' }}</td>
            <td>
              @if (item.owner; as owner) {
                <span class="block">{{ owner.name }}</span>
                <span class="block text-xs text-muted">{{ owner.email }}</span>
              } @else {
                —
              }
            </td>
            <td class="whitespace-nowrap text-muted">{{ item.createdAt | date: 'dd/MM/yy' }}</td>
            <td class="whitespace-nowrap text-muted">{{ item.activatedAt ? (item.activatedAt | date: 'dd/MM/yy') : '—' }}</td>
            <td class="text-right">
              <a [routerLink]="['/admin/petids', item.id]" class="btn btn-ghost btn-sm">Ver QR</a>
            </td>
          </tr>
        }
      </tbody>
    </app-admin-table>
    @if (items().length >= limit) {
      <p class="mt-3 text-center text-xs text-muted">Mostrando las {{ limit }} más recientes. Usa los filtros o la búsqueda para encontrar otras.</p>
    }
  `,
})
export class PetIdList {
  private readonly repo = inject(AdminRepository);
  private readonly router = inject(Router);

  /** Query params (dashboard links and filters). */
  readonly status = input<PetIdStatus | null>(null);
  readonly q = input<string | null>(null);
  readonly generate = input<string>();

  protected readonly limit = 300;
  protected readonly statuses = PET_ID_STATUSES;
  protected readonly formats = LABEL_FORMATS;
  protected readonly format = signal<LabelFormat>(savedLabelFormat());
  protected readonly statusLabels = PET_ID_STATUS_LABELS;
  protected readonly items = signal<PetIdRecord[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly showForm = signal(false);
  protected readonly justCreated = signal<string[]>([]);
  protected readonly selected = signal(new Set<string>());
  protected readonly actionError = signal<string | null>(null);

  protected readonly allSelected = computed(() => {
    const items = this.items();
    return items.length > 0 && items.every((i) => this.selected().has(i.id));
  });

  protected readonly sellable = computed(() =>
    this.items().filter((i) => this.selected().has(i.id) && allowedPetIdTransitions(i.status, !!i.pet).includes('sold')),
  );

  constructor() {
    effect(() => {
      const status = this.status();
      const q = this.q();
      untracked(() => void this.load(status, q));
    });
    effect(() => {
      if (this.generate()) untracked(() => this.showForm.set(true));
    });
  }

  clearSelection() {
    this.selected.set(new Set());
  }

  async load(status = this.status(), q = this.q()) {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.items.set(await this.repo.listPetIds({ status: status || null, search: q ?? '', limit: this.limit }));
    } catch {
      this.error.set('No pudimos cargar las PetIDs.');
    } finally {
      this.loading.set(false);
    }
  }

  setStatus(status: PetIdStatus | null) {
    this.clearSelection();
    void this.router.navigate([], { queryParams: { status, q: this.q() || null }, replaceUrl: true });
  }

  search(event: Event, value: string) {
    event.preventDefault();
    void this.router.navigate([], { queryParams: { status: this.status() || null, q: value.trim() || null }, replaceUrl: true });
  }

  async onCreated(ids: string[]) {
    if (ids.length === 1) {
      await this.router.navigate(['/admin/petids', ids[0]], { queryParams: { created: 1 } });
      return;
    }
    this.showForm.set(false);
    this.justCreated.set(ids);
    this.selected.set(new Set(ids));
    await this.load();
  }

  toggle(id: string) {
    this.selected.update((set) => {
      const next = new Set(set);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  toggleAll() {
    this.selected.set(this.allSelected() ? new Set() : new Set(this.items().map((i) => i.id)));
  }

  protected setFormat(format: LabelFormat) {
    this.format.set(format);
    saveLabelFormat(format);
  }

  async printIds(ids: string[]) {
    const known = new Map(this.items().map((i) => [i.id, i]));
    const missing = ids.filter((id) => !known.has(id));
    const records = [...ids.filter((id) => known.has(id)).map((id) => known.get(id)!), ...(missing.length ? await this.repo.getPetIds(missing) : [])];
    records.sort((a, b) => a.code.localeCompare(b.code));
    const opened = printLabels(
      records.map((r) => ({ code: r.code, url: publicPetIdUrl(r.qrToken), name: r.pet?.name })),
      this.format(),
    );
    this.actionError.set(opened ? null : 'Permite las ventanas emergentes para imprimir.');
  }

  async markSold() {
    this.busy.set(true);
    this.actionError.set(null);
    try {
      await Promise.all(this.sellable().map((i) => this.repo.setPetIdStatus(i.id, 'sold')));
      this.clearSelection();
      await this.load();
    } catch {
      this.actionError.set('No pudimos actualizar algunas PetIDs.');
    } finally {
      this.busy.set(false);
    }
  }
}
