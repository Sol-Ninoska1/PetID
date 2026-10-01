import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { PushService } from '../../core/push/push.service';
import { Icon } from '../../shared/ui/icon';

/** Lets the owner turn on phone notifications for scans, shared locations and found reports. */
@Component({
  selector: 'app-push-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    @if (push.subscribed()) {
      <p class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
        <app-icon name="bell" class="size-4 text-brand-600" />
        Avisos activados en este dispositivo.
        <button type="button" class="font-semibold text-slate-600 underline-offset-2 hover:underline" [disabled]="busy()" (click)="disable()">
          Desactivar
        </button>
      </p>
    } @else {
      <section class="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div class="flex min-w-0 flex-1 items-start gap-3">
          <span class="grid size-8 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <app-icon name="bell" class="size-4" />
          </span>
          <div class="min-w-0 flex-1">
            <h2 class="text-sm font-bold leading-snug">Recibe un aviso cuando escaneen su placa</h2>
            @switch (push.availability) {
              @case ('ios-install') {
                <p class="mt-0.5 text-xs text-muted">
                  En iPhone, primero agrega PetID a tu pantalla de inicio (botón <strong>Compartir</strong> →
                  <strong>Agregar a inicio</strong>) y ábrela desde ahí.
                </p>
              }
              @case ('dev') {
                <p class="mt-0.5 text-xs text-muted">Las notificaciones funcionan en la versión publicada, no en modo desarrollo.</p>
              }
              @case ('unsupported') {
                <p class="mt-0.5 text-xs text-muted">Este navegador no permite notificaciones. Prueba con Chrome, Edge, Firefox o Safari actualizado.</p>
              }
              @default {
                @if (push.permission() === 'denied') {
                  <p class="mt-0.5 text-xs text-muted">Bloqueaste las notificaciones de PetID. Actívalas en la configuración del navegador y vuelve a intentarlo.</p>
                } @else {
                  <p class="mt-0.5 text-xs text-muted">Te llega una notificación con la zona aproximada del escaneo, y el mapa exacto si la persona comparte su GPS.</p>
                }
              }
            }
            @if (error()) {
              <p class="field-error">{{ error() }}</p>
            }
          </div>
        </div>
        @if (push.availability === 'available' && push.permission() !== 'denied') {
          <button type="button" class="btn btn-primary btn-sm shrink-0" [disabled]="busy()" (click)="enable()">
            {{ busy() ? 'Activando…' : 'Activar avisos' }}
          </button>
        }
      </section>
    }
  `,
})
export class PushCard implements OnInit {
  protected readonly push = inject(PushService);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit() {
    void this.push.sync().catch(() => undefined);
  }

  async enable() {
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.push.enable();
    } catch {
      this.error.set(
        this.push.permission() === 'denied'
          ? 'No diste permiso para mostrar notificaciones.'
          : 'No pudimos activar los avisos. Inténtalo de nuevo.',
      );
    } finally {
      this.busy.set(false);
    }
  }

  async disable() {
    this.busy.set(true);
    try {
      await this.push.disable();
    } finally {
      this.busy.set(false);
    }
  }
}
