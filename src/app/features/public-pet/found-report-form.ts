import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PublicPetRepository } from '../../core/data/public-pet.repository';
import { Icon } from '../../shared/ui/icon';
import { GeoPoint } from '../../core/models';
import { PHONE_PATTERN } from '../../shared/utils/contact';
import { getCurrentPosition } from '../../shared/utils/geolocation';
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
          <p class="mt-2 text-sm text-muted">
            @if (sentPoint()) {
              Le enviamos tu ubicación. Si puedes, mantén a {{ petName() }} en un lugar seguro hasta que te contacten.
            } @else {
              Si puedes, mantén a {{ petName() }} en un lugar seguro y toca <strong>"Enviar mi ubicación"</strong> en el perfil para que sepa dónde está.
            }
          </p>
          <button type="button" class="btn btn-primary mt-6 w-full" (click)="closed.emit()">Volver al perfil</button>
        </div>
      } @else {
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 id="found-title" class="text-xl font-bold">Encontraste a {{ petName() }}</h2>
            <p class="mt-1 text-sm text-muted">El dueño recibirá tu aviso al instante. Tus datos solo los ve él.</p>
          </div>
          <button type="button" class="btn btn-ghost btn-sm -mr-2 -mt-1" (click)="closed.emit()" aria-label="Cerrar">
            <app-icon name="x" class="size-5" />
          </button>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="mt-5 space-y-4" novalidate>
          <div>
            <label class="field-label" for="message">Mensaje</label>
            <textarea id="message" rows="3" class="field-input" formControlName="message"
              placeholder="Ej: Está conmigo en la plaza, tranquila y con agua."></textarea>
          </div>
          <div>
            <label class="field-label" for="reporterPhone">Tu teléfono <span class="font-normal text-muted">(opcional)</span></label>
            <input id="reporterPhone" type="tel" inputmode="tel" class="field-input" formControlName="reporterPhone" autocomplete="tel" placeholder="+56 9…" />
            @if (showError(form.controls.reporterPhone)) {
              <p class="field-error">Ingresa un teléfono válido.</p>
            } @else {
              <p class="mt-1 text-xs text-muted">Si lo dejas, el dueño podrá llamarte o escribirte por WhatsApp.</p>
            }
          </div>

          <p class="flex items-center gap-2 text-xs" [class]="point() ? 'text-brand-700' : 'text-muted'" role="status">
            <app-icon [name]="point() ? 'check' : 'map-pin'" class="size-4 shrink-0" />
            @if (point()) {
              Tu ubicación se enviará con el aviso.
            } @else if (locating()) {
              Buscando tu ubicación para enviársela al dueño…
            } @else {
              Sin ubicación: el aviso se enviará igual.
            }
          </p>

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

  protected readonly locating = signal(true);
  protected readonly point = signal<GeoPoint | null>(null);
  protected readonly sentPoint = signal(false);
  /** Started when the sheet opens so the GPS is usually ready by the time the finder taps "Avisar al dueño". */
  private readonly position = getCurrentPosition()
    .then(({ coords }) => this.point.set({ lat: coords.latitude, lng: coords.longitude }))
    .catch(() => undefined)
    .finally(() => this.locating.set(false));

  protected readonly form = inject(NonNullableFormBuilder).group({
    message: ['', Validators.maxLength(1000)],
    reporterPhone: ['', Validators.pattern(PHONE_PATTERN)],
  });

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.sending.set(true);
    this.error.set(null);
    try {
      // A late GPS fix shouldn't hold the alert for long.
      if (this.locating()) await Promise.race([this.position, new Promise((r) => setTimeout(r, 4000))]);
      const v = this.form.getRawValue();
      const point = this.point();
      await this.repo.submitFoundReport(this.token(), { reporterPhone: v.reporterPhone || null, message: v.message || null, point });
      this.sentPoint.set(!!point);
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
