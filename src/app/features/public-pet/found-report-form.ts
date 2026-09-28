import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PublicPetRepository } from '../../core/data/public-pet.repository';
import { GeoPoint } from '../../core/models';
import { Icon } from '../../shared/ui/icon';
import { PHONE_PATTERN } from '../../shared/utils/contact';
import { GEOLOCATION_MESSAGES, GeolocationError, getCurrentPosition } from '../../shared/utils/geolocation';
import { showError } from '../../shared/utils/validators';

/** Bottom sheet opened by "ENCONTRÉ A ESTA MASCOTA". No account needed. */
@Component({
  selector: 'app-found-report-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Icon],
  host: { class: 'fixed inset-0 z-50 flex items-end justify-center sm:items-center' },
  template: `
    <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" (click)="closed.emit()"></div>

    <div class="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl"
      role="dialog" aria-modal="true" aria-labelledby="found-title">
      @if (sent()) {
        <div class="py-6 text-center">
          <div class="mx-auto grid size-16 place-items-center rounded-full bg-brand-100 text-3xl">💚</div>
          <h2 id="found-title" class="mt-4 text-2xl font-bold">¡Gracias!</h2>
          <p class="mt-2 text-lg">El dueño de {{ petName() }} ha sido avisado.</p>
          <p class="mt-2 text-sm text-muted">Si puedes, mantén a {{ petName() }} en un lugar seguro hasta que te contacten.</p>
          <button type="button" class="btn btn-primary mt-6 w-full" (click)="closed.emit()">Volver al perfil</button>
        </div>
      } @else {
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 id="found-title" class="text-xl font-bold">Encontraste a {{ petName() }}</h2>
            <p class="mt-1 text-sm text-muted">Tus datos solo se envían al dueño para que pueda contactarte.</p>
          </div>
          <button type="button" class="btn btn-ghost btn-sm -mr-2 -mt-1" (click)="closed.emit()" aria-label="Cerrar">
            <app-icon name="x" class="size-5" />
          </button>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="mt-5 space-y-4" novalidate>
          <div>
            <label class="field-label" for="reporterName">Tu nombre *</label>
            <input id="reporterName" class="field-input" formControlName="reporterName" autocomplete="name" />
            @if (showError(form.controls.reporterName)) {
              <p class="field-error">Ingresa tu nombre.</p>
            }
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="field-label" for="reporterPhone">Teléfono *</label>
              <input id="reporterPhone" type="tel" inputmode="tel" class="field-input" formControlName="reporterPhone" autocomplete="tel" placeholder="+56 9…" />
              @if (showError(form.controls.reporterPhone)) {
                <p class="field-error">Ingresa un teléfono válido.</p>
              }
            </div>
            <div>
              <label class="field-label" for="reporterEmail">Email <span class="font-normal text-muted">(opcional)</span></label>
              <input id="reporterEmail" type="email" inputmode="email" class="field-input" formControlName="reporterEmail" autocomplete="email" />
              @if (showError(form.controls.reporterEmail)) {
                <p class="field-error">Email no válido.</p>
              }
            </div>
          </div>
          <div>
            <label class="field-label" for="message">Mensaje</label>
            <textarea id="message" rows="3" class="field-input" formControlName="message"
              placeholder="Ej: Está conmigo, tranquila y con agua. Estoy en la plaza."></textarea>
          </div>
          <div>
            <label class="field-label" for="locationText">¿Dónde está?</label>
            <input id="locationText" class="field-input" formControlName="locationText" placeholder="Calle, esquina o punto de referencia" />
            <button type="button" class="btn btn-secondary btn-sm mt-2" [disabled]="locating()" (click)="useMyLocation()">
              <app-icon [name]="point() ? 'check' : 'map-pin'" class="size-4" />
              {{ locating() ? 'Obteniendo ubicación…' : point() ? 'Ubicación agregada' : 'Usar mi ubicación actual' }}
            </button>
            @if (locationError()) {
              <p class="field-error">{{ locationError() }}</p>
            }
          </div>

          @if (error()) {
            <p class="alert-error" role="alert">{{ error() }}</p>
          }

          <button type="submit" class="btn btn-danger w-full py-4 text-base" [disabled]="sending()">
            {{ sending() ? 'Enviando…' : 'Avisar al dueño' }}
          </button>
        </form>
      }
    </div>
  `,
})
export class FoundReportForm {
  private readonly repo = inject(PublicPetRepository);

  readonly token = input.required<string>();
  readonly petName = input.required<string>();
  readonly closed = output<void>();

  protected readonly showError = showError;
  protected readonly sending = signal(false);
  protected readonly sent = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly locating = signal(false);
  protected readonly locationError = signal<string | null>(null);
  protected readonly point = signal<GeoPoint | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    reporterName: ['', [Validators.required, Validators.maxLength(100)]],
    reporterPhone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
    reporterEmail: ['', [Validators.email, Validators.maxLength(200)]],
    message: ['', Validators.maxLength(1000)],
    locationText: ['', Validators.maxLength(300)],
  });

  async useMyLocation() {
    this.locating.set(true);
    this.locationError.set(null);
    try {
      const { coords } = await getCurrentPosition();
      this.point.set({ lat: coords.latitude, lng: coords.longitude });
    } catch (e) {
      this.locationError.set(GEOLOCATION_MESSAGES[e instanceof GeolocationError ? e.reason : 'unavailable']);
    } finally {
      this.locating.set(false);
    }
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.sending.set(true);
    this.error.set(null);
    try {
      const v = this.form.getRawValue();
      await this.repo.submitFoundReport(this.token(), {
        reporterName: v.reporterName,
        reporterPhone: v.reporterPhone,
        reporterEmail: v.reporterEmail || null,
        message: v.message || null,
        locationText: v.locationText || null,
        point: this.point(),
      });
      this.sent.set(true);
    } catch (e) {
      this.error.set(
        e instanceof Error && /rate_limited/.test(e.message)
          ? 'Ya se enviaron varios avisos recientemente. Intenta llamar o escribir por WhatsApp.'
          : 'No pudimos enviar el aviso. Revisa tu conexión e inténtalo de nuevo.',
      );
    } finally {
      this.sending.set(false);
    }
  }
}
