import { ChangeDetectionStrategy, Component, effect, inject, input, signal, untracked } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FeedbackRepository } from '../../core/data/feedback.repository';
import { SupportTopic } from '../../core/models';
import { Icon } from '../../shared/ui/icon';
import { PHONE_PATTERN } from '../../shared/utils/contact';
import { showError } from '../../shared/utils/validators';

const MESSAGE_MAX = 2000;

/** Lets other sections open the form with a topic (and starter message) already chosen. */
export interface SupportPreset {
  topic: SupportTopic;
  message?: string;
}

const TOPICS: { value: SupportTopic; label: string }[] = [
  { value: 'activacion', label: 'Activación de mi PetID' },
  { value: 'pedido', label: 'Compra o envío' },
  { value: 'tecnico', label: 'Problema técnico' },
  { value: 'sugerencia', label: 'Sugerencia' },
  { value: 'otro', label: 'Otro' },
];

/** Contact form: the message is saved and emailed to the admin. */
@Component({
  selector: 'app-support-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Icon],
  template: `
    <div class="card grid overflow-hidden md:grid-cols-[18rem_1fr]">
      <div class="bg-gradient-to-br from-brand-600 to-brand-800 p-8 text-white">
        <span class="grid size-12 place-items-center rounded-2xl bg-white/15"><app-icon name="help" class="size-6" /></span>
        <h2 class="mt-5 text-2xl font-bold tracking-tight">¿Necesitas ayuda?</h2>
        <p class="mt-2 text-brand-100">Escríbenos y te responderemos por email lo antes posible.</p>
        <ul class="mt-6 space-y-3 text-sm text-brand-50">
          <li class="flex gap-2"><app-icon name="check" class="size-5 text-accent-400" /> Problemas para activar tu placa</li>
          <li class="flex gap-2"><app-icon name="check" class="size-5 text-accent-400" /> Dudas sobre tu compra o envío</li>
          <li class="flex gap-2"><app-icon name="check" class="size-5 text-accent-400" /> Sugerencias para mejorar PetID</li>
        </ul>
      </div>

      <div class="p-6 sm:p-8">
        @if (sentTo(); as email) {
          <div class="grid h-full place-items-center py-8 text-center">
            <div>
              <span class="mx-auto grid size-16 place-items-center rounded-full bg-brand-100 text-brand-700"><app-icon name="send" class="size-7" /></span>
              <p class="mt-4 text-xl font-bold">¡Mensaje enviado!</p>
              <p class="mt-1 text-muted">Te responderemos a <strong class="text-ink">{{ email }}</strong>.</p>
              <button type="button" class="btn btn-secondary mt-6" (click)="sentTo.set(null)">Enviar otro mensaje</button>
            </div>
          </div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="submit()" class="grid gap-4 sm:grid-cols-2" novalidate>
            <div>
              <label class="field-label" for="support-name">Nombre *</label>
              <input id="support-name" class="field-input" formControlName="name" autocomplete="name" placeholder="Ej: María" />
              @if (showError(form.controls.name)) { <p class="field-error">Ingresa tu nombre.</p> }
            </div>
            <div>
              <label class="field-label" for="support-email">Email *</label>
              <input id="support-email" type="email" class="field-input" formControlName="email" autocomplete="email" inputmode="email" placeholder="Ej: maria02@gmail.com" />
              @if (showError(form.controls.email)) { <p class="field-error">Ingresa un email válido para poder responderte.</p> }
            </div>
            <div>
              <label class="field-label" for="support-phone">Teléfono <span class="font-normal text-muted">(opcional)</span></label>
              <input id="support-phone" type="tel" class="field-input" formControlName="phone" autocomplete="tel" inputmode="tel" placeholder="Ej: 9 XXXXXXXX" />
              @if (showError(form.controls.phone)) { <p class="field-error">Ingresa un teléfono válido.</p> }
            </div>
            <div>
              <label class="field-label" for="support-topic">Tema *</label>
              <select id="support-topic" class="field-input" formControlName="topic">
                @for (t of topics; track t.value) {
                  <option [value]="t.value">{{ t.label }}</option>
                }
              </select>
            </div>
            <div class="sm:col-span-2">
              <label class="field-label" for="support-message">Mensaje *</label>
              <textarea id="support-message" rows="5" class="field-input" formControlName="message" [maxlength]="messageMax"
                placeholder="Cuéntanos qué necesitas. Si es sobre tu placa, incluye su código (ej: PET-00001)."></textarea>
              <div class="mt-1 flex justify-between gap-4">
                @if (showError(form.controls.message)) { <p class="field-error mt-0">Escribe tu mensaje.</p> } @else { <span></span> }
                <span class="text-xs text-muted">{{ form.controls.message.value.length }}/{{ messageMax }}</span>
              </div>
            </div>
            <!-- Honeypot: invisible to people, bots tend to fill it. -->
            <input type="text" formControlName="website" class="hidden" tabindex="-1" autocomplete="off" aria-hidden="true" />
            @if (error()) {
              <p class="alert-error sm:col-span-2" role="alert">{{ error() }}</p>
            }
            <div class="sm:col-span-2">
              <button type="submit" class="btn btn-primary w-full sm:w-auto sm:px-8" [disabled]="sending()">
                <app-icon name="send" class="size-4" /> {{ sending() ? 'Enviando…' : 'Enviar mensaje' }}
              </button>
            </div>
          </form>
        }
      </div>
    </div>
  `,
})
export class SupportSection {
  private readonly repo = inject(FeedbackRepository);

  readonly preset = input<SupportPreset | null>(null);

  protected readonly topics = TOPICS;
  protected readonly messageMax = MESSAGE_MAX;
  protected readonly showError = showError;
  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly sentTo = signal<string | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/\S/)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(200)]],
    phone: ['', [Validators.pattern(PHONE_PATTERN)]],
    topic: ['activacion' as SupportTopic, Validators.required],
    message: ['', [Validators.required, Validators.maxLength(MESSAGE_MAX), Validators.pattern(/\S/)]],
    website: [''],
  });

  constructor() {
    effect(() => {
      const preset = this.preset();
      if (!preset) return;
      untracked(() => {
        this.sentTo.set(null);
        this.form.controls.topic.setValue(preset.topic);
        const message = this.form.controls.message;
        if (preset.message && !message.value.trim()) message.setValue(preset.message);
      });
    });
  }

  protected async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { website, ...value } = this.form.getRawValue();
    if (website) {
      this.sentTo.set(value.email);
      return;
    }
    this.sending.set(true);
    this.error.set(null);
    try {
      await this.repo.sendSupport({
        name: value.name.trim(),
        email: value.email.trim(),
        phone: value.phone.trim() || null,
        topic: value.topic,
        message: value.message.trim(),
      });
      this.sentTo.set(value.email.trim());
      this.form.controls.message.reset('');
    } catch (e) {
      this.error.set(
        e instanceof Error && e.message === 'too_many_messages'
          ? 'Enviaste varios mensajes seguidos. Espera un rato e inténtalo de nuevo.'
          : 'No pudimos enviar tu mensaje. Revisa tu conexión e inténtalo de nuevo.',
      );
    } finally {
      this.sending.set(false);
    }
  }
}
