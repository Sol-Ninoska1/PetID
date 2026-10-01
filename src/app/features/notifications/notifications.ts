import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { skip } from 'rxjs';
import { ActivityRepository } from '../../core/data/activity.repository';
import { OwnerNotification } from '../../core/models';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { Icon } from '../../shared/ui/icon';
import { mapsHref, telHref, whatsappHref } from '../../shared/utils/contact';
import { deviceLabel } from '../../shared/utils/pet';

function dayLabel(date: Date): string {
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((day(new Date()) - day(date)) / 86_400_000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  const label = date.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** /avisos — the owner's notification history: found reports, shared locations and notified scans. */
@Component({
  selector: 'app-notifications',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, Icon, RelativeTimePipe],
  template: `
    <a routerLink="/dashboard" class="btn btn-ghost btn-sm -ml-3 mb-2">
      <app-icon name="arrow-left" class="size-4" /> Mis mascotas
    </a>
    <h1 class="text-2xl font-bold tracking-tight">Avisos</h1>
    <p class="mt-1 text-muted">Escaneos, ubicaciones y reportes de tus mascotas.</p>
    @if (items().length) {
      <div class="mt-3 flex justify-end">
        <button type="button" class="btn btn-secondary btn-sm" [disabled]="busy()" (click)="clear()">
          <app-icon name="trash" class="size-4 text-red-600" /> Limpiar historial
        </button>
      </div>
    }

    @if (error()) {
      <p class="alert-error mt-6" role="alert">{{ error() }}</p>
    }

    @if (loading()) {
      <div class="mt-6 space-y-3">
        @for (i of [1, 2, 3]; track i) {
          <div class="card h-24 animate-pulse bg-white/60"></div>
        }
      </div>
    } @else if (!items().length) {
      <section class="card mt-6 flex flex-col items-center px-6 py-12 text-center">
        <span class="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">
          <app-icon name="bell" class="size-7" />
        </span>
        <h2 class="mt-4 font-bold">No tienes avisos</h2>
        <p class="mt-1 max-w-sm text-sm text-muted">
          Aquí aparecerá cuando escaneen la placa, te compartan una ubicación o alguien reporte que encontró a tu mascota.
        </p>
      </section>
    } @else {
      @for (group of groups(); track group.label) {
        <section class="mt-6" [attr.aria-label]="group.label">
          <h2 class="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">{{ group.label }}</h2>
          <ul class="card divide-y divide-slate-100 overflow-hidden">
            @for (n of group.items; track n.id) {
              <li class="flex gap-3 px-4 py-3" [class]="n.unseen ? 'bg-brand-50/60' : ''">
                <span class="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full"
                  [class]="n.kind === 'found_report' ? 'bg-red-100 text-red-600' : 'bg-brand-50 text-brand-700 ring-1 ring-brand-100'">
                  <app-icon [name]="n.kind === 'found_report' ? 'alert' : n.kind === 'scan' ? 'qr' : 'map-pin'" class="size-4" />
                </span>
                <div class="min-w-0 flex-1">
                  <div class="flex items-start justify-between gap-2">
                    <p class="text-sm font-semibold leading-snug">
                      @switch (n.kind) {
                        @case ('found_report') { {{ n.data.reporterName ? n.data.reporterName + ' encontró a ' + n.petName : '¡Encontraron a ' + n.petName + '!' }} }
                        @case ('location_share') { Compartieron la ubicación de {{ n.petName }} }
                        @case ('scan') { Escanearon la placa de {{ n.petName }} }
                      }
                    </p>
                    @if (n.unseen) {
                      <span class="mt-1.5 size-2 shrink-0 rounded-full bg-brand-600"><span class="sr-only">Nuevo</span></span>
                    }
                  </div>

                  @switch (n.kind) {
                    @case ('found_report') {
                      @let report = n.data;
                      @if (report.message) {
                        <p class="mt-1 text-sm">"{{ report.message }}"</p>
                      }
                      @if (report.location.text) {
                        <p class="mt-0.5 text-xs text-muted">{{ report.location.text }}</p>
                      }
                    }
                    @case ('location_share') {
                      @if (n.data.accuracyM) {
                        <p class="mt-0.5 text-xs text-muted">GPS · precisión ±{{ round(n.data.accuracyM) }} m</p>
                      }
                    }
                    @case ('scan') {
                      @let scan = n.data;
                      <p class="mt-0.5 truncate text-xs text-muted">
                        {{ deviceLabel(scan.userAgent, scan.device) }}{{ scan.place ? ' · cerca de ' + city(scan.place) : '' }}
                      </p>
                    }
                  }

                  <p class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    <span>{{ group.today ? (n.createdAt | relativeTime) : (n.createdAt | date: 'HH:mm') }}</span>
                    @switch (n.kind) {
                      @case ('location_share') {
                        <a class="inline-flex items-center gap-1 font-semibold text-brand-700" target="_blank" rel="noopener"
                          [href]="mapsHref(n.data.point.lat, n.data.point.lng)">
                          <app-icon name="map-pin" class="size-3.5" /> Ver en mapa
                        </a>
                      }
                      @case ('scan') {
                        @if (n.data.approximateLocation; as p) {
                          <a class="inline-flex items-center gap-1 font-semibold text-brand-700" target="_blank" rel="noopener" [href]="mapsHref(p.lat, p.lng)">
                            <app-icon name="map-pin" class="size-3.5" /> Ver zona
                          </a>
                        }
                      }
                    }
                  </p>

                  @if (n.kind === 'found_report') {
                    @let report = n.data;
                    @if (report.reporterPhone || report.location.point) {
                      <div class="mt-2 flex flex-wrap gap-1.5">
                        @if (report.reporterPhone; as phone) {
                          <a class="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition bg-brand-600 text-white hover:bg-brand-700" [href]="telHref(phone)">
                            <app-icon name="phone" class="size-3.5" /> Llamar
                          </a>
                          <a class="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition bg-white text-ink ring-1 ring-slate-200 hover:bg-slate-50" target="_blank" rel="noopener"
                            [href]="whatsappHref(phone, 'Hola, soy el dueño de ' + n.petName + '. ¡Gracias por avisarme!')">
                            <app-icon name="message" class="size-3.5" /> WhatsApp
                          </a>
                        }
                        @if (report.location.point; as p) {
                          <a class="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition bg-white text-ink ring-1 ring-slate-200 hover:bg-slate-50" target="_blank" rel="noopener" [href]="mapsHref(p.lat, p.lng)">
                            <app-icon name="map-pin" class="size-3.5" /> Mapa
                          </a>
                        }
                      </div>
                    } @else {
                      <p class="mt-1 text-xs text-muted">No dejó teléfono. Revisa si te compartió su ubicación.</p>
                    }
                  }
                </div>
              </li>
            }
          </ul>
        </section>
      }
    }
  `,
})
export class Notifications implements OnInit {
  private readonly repo = inject(ActivityRepository);
  private readonly notifications = inject(NotificationsService);
  private readonly confirmDialog = inject(ConfirmService);

  protected readonly telHref = telHref;
  protected readonly whatsappHref = whatsappHref;
  protected readonly mapsHref = mapsHref;
  protected readonly deviceLabel = deviceLabel;
  protected readonly round = Math.round;
  /** "Santiago, Santiago Metropolitan" → "Santiago": the region adds length on a phone, not information. */
  protected readonly city = (place: string) => place.split(',')[0];

  protected readonly items = signal<OwnerNotification[]>([]);
  /** Newest first, split into Hoy / Ayer / weekday + date (local time). */
  protected readonly groups = computed(() => {
    const groups: { label: string; today: boolean; items: OwnerNotification[] }[] = [];
    for (const n of this.items()) {
      const label = dayLabel(new Date(n.createdAt));
      const last = groups.at(-1);
      if (last?.label === label) last.items.push(n);
      else groups.push({ label, today: label === 'Hoy', items: [n] });
    }
    return groups;
  });
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.notifications.viewing = true;
    inject(DestroyRef).onDestroy(() => (this.notifications.viewing = false));
    toObservable(this.notifications.changes)
      .pipe(skip(1), takeUntilDestroyed())
      .subscribe(() => this.load());
  }

  async ngOnInit() {
    await this.load();
    this.loading.set(false);
  }

  private async load() {
    try {
      // "Nuevo" stays on everything that arrived during this visit; the bell resets right away.
      const shown = new Set(this.items().filter((n) => n.unseen).map((n) => n.id));
      const items = await this.repo.listNotifications();
      this.items.set(items.map((n) => (shown.has(n.id) ? { ...n, unseen: true } : n)));
      this.error.set(null);
      await this.notifications.markSeen().catch(() => undefined);
    } catch {
      this.error.set('No pudimos cargar tus avisos. Revisa tu conexión e inténtalo de nuevo.');
    }
  }

  async clear() {
    const ok = await this.confirmDialog.ask({
      title: '¿Limpiar el historial?',
      message: 'Se borran los avisos de esta lista. La actividad de cada mascota se mantiene.',
      confirmText: 'Limpiar',
      icon: 'trash',
      danger: true,
    });
    if (!ok) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.notifications.clear();
      this.items.set([]);
    } catch {
      this.error.set('No pudimos limpiar el historial.');
    } finally {
      this.busy.set(false);
    }
  }
}
