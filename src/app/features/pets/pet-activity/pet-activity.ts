import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActivityRepository } from '../../../core/data/activity.repository';
import { PetsRepository } from '../../../core/data/pets.repository';
import { FoundReport, LocationShare, Pet, Scan } from '../../../core/models';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';
import { Icon } from '../../../shared/ui/icon';
import { mapsHref, telHref } from '../../../shared/utils/contact';
import { deviceLabel } from '../../../shared/utils/pet';

@Component({
  selector: 'app-pet-activity',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, RelativeTimePipe],
  template: `
    <a routerLink="/dashboard" class="btn btn-ghost btn-sm -ml-3 mb-2">
      <app-icon name="arrow-left" class="size-4" /> Mis mascotas
    </a>
    <h1 class="text-2xl font-bold tracking-tight">Actividad{{ pet() ? ' de ' + pet()!.name : '' }}</h1>
    <p class="mt-1 text-muted">Cada escaneo queda registrado con la zona aproximada. Nunca mostramos datos personales del visitante.</p>

    @if (error()) {
      <p class="alert-error mt-6">{{ error() }}</p>
    } @else if (loading()) {
      <div class="card mt-6 h-64 animate-pulse bg-white/60"></div>
    } @else {
      <div class="mt-6 grid gap-6 lg:grid-cols-2">
        <section class="card p-5">
          <h2 class="flex items-center gap-2 font-bold"><app-icon name="activity" class="size-5 text-brand-600" /> Escaneos</h2>
          @if (!scans().length) {
            <p class="mt-4 text-sm text-muted">Todavía nadie ha escaneado su PetID.</p>
          } @else {
            <ul class="mt-3 divide-y divide-slate-100">
              @for (scan of scans(); track scan.id) {
                <li class="flex items-center gap-3 py-3">
                  <span class="grid size-9 place-items-center rounded-full bg-brand-50 text-brand-700">
                    <app-icon name="qr" class="size-4" />
                  </span>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium">Tu PetID fue escaneada {{ scan.scannedAt | relativeTime }}</p>
                    <p class="text-xs text-muted">
                      {{ deviceLabel(scan.userAgent, scan.device) }}
                      @if (scan.locationSource === 'gps') {
                        · <span class="font-semibold text-brand-700">GPS compartido</span>
                      } @else if (scan.place) {
                        · Cerca de {{ scan.place }} <span class="whitespace-nowrap">(aprox. por conexión)</span>
                      }
                    </p>
                  </div>
                  @if (scan.approximateLocation; as p) {
                    <a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" [href]="mapsHref(p.lat, p.lng)"
                      [title]="scan.locationSource === 'gps' ? 'Ubicación GPS (±1 km)' : 'Zona aproximada por conexión'">
                      <app-icon name="map-pin" class="size-4" /> {{ scan.locationSource === 'gps' ? 'Mapa' : 'Zona' }}
                    </a>
                  }
                </li>
              }
            </ul>
          }
        </section>

        <div class="space-y-6">
          <section class="card p-5">
            <h2 class="flex items-center gap-2 font-bold"><app-icon name="alert" class="size-5 text-red-600" /> Avisos de "la encontré"</h2>
            @if (!reports().length) {
              <p class="mt-4 text-sm text-muted">Sin avisos.</p>
            } @else {
              <ul class="mt-3 divide-y divide-slate-100">
                @for (r of reports(); track r.id) {
                  <li class="py-3 text-sm">
                    <p class="font-medium">{{ r.reporterName }} · <span class="text-muted">{{ r.createdAt | relativeTime }}</span></p>
                    @if (r.message) {
                      <p class="mt-1">"{{ r.message }}"</p>
                    }
                    <div class="mt-2 flex flex-wrap gap-2">
                      <a class="btn btn-secondary btn-sm" [href]="telHref(r.reporterPhone)"><app-icon name="phone" class="size-4" /> {{ r.reporterPhone }}</a>
                      @if (r.location.point; as p) {
                        <a class="btn btn-secondary btn-sm" target="_blank" rel="noopener" [href]="mapsHref(p.lat, p.lng)"><app-icon name="map-pin" class="size-4" /> Mapa</a>
                      }
                    </div>
                  </li>
                }
              </ul>
            }
          </section>

          <section class="card p-5">
            <h2 class="flex items-center gap-2 font-bold"><app-icon name="map-pin" class="size-5 text-brand-600" /> Ubicaciones recibidas</h2>
            @if (!shares().length) {
              <p class="mt-4 text-sm text-muted">Nadie ha enviado su ubicación.</p>
            } @else {
              <ul class="mt-3 divide-y divide-slate-100">
                @for (s of shares(); track s.id) {
                  <li class="flex items-center justify-between py-3 text-sm">
                    <span>Ubicación enviada {{ s.createdAt | relativeTime }}</span>
                    <a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" [href]="mapsHref(s.point.lat, s.point.lng)">Ver mapa</a>
                  </li>
                }
              </ul>
            }
          </section>
        </div>
      </div>
    }
  `,
})
export class PetActivity implements OnInit {
  private readonly petsRepo = inject(PetsRepository);
  private readonly activityRepo = inject(ActivityRepository);

  readonly id = input.required<string>();

  protected readonly deviceLabel = deviceLabel;
  protected readonly mapsHref = mapsHref;
  protected readonly telHref = telHref;

  protected readonly pet = signal<Pet | null>(null);
  protected readonly scans = signal<Scan[]>([]);
  protected readonly reports = signal<FoundReport[]>([]);
  protected readonly shares = signal<LocationShare[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  async ngOnInit() {
    const id = this.id();
    try {
      const [{ pet }, scans, reports, shares] = await Promise.all([
        this.petsRepo.getById(id),
        this.activityRepo.listScans(id),
        this.activityRepo.listFoundReports(id),
        this.activityRepo.listLocationShares(id),
      ]);
      this.pet.set(pet);
      this.scans.set(scans);
      this.reports.set(reports);
      this.shares.set(shares);
    } catch {
      this.error.set('No pudimos cargar la actividad.');
    } finally {
      this.loading.set(false);
    }
  }
}
