import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { authErrorMessage } from '../../../core/auth/auth-errors';
import { AuthService } from '../../../core/auth/auth.service';
import { showError } from '../../../shared/utils/validators';
import { AuthShell } from '../auth-shell';

@Component({
  selector: 'app-forgot-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthShell],
  template: `
    <app-auth-shell heading="Recuperar contraseña" subheading="Te enviaremos un enlace para crear una nueva.">
      @if (sent()) {
        <div class="alert-success">
          Si existe una cuenta con ese email, recibirás un enlace en unos minutos. Revisa también la carpeta de spam.
        </div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4" novalidate>
          <div>
            <label class="field-label" for="email">Email</label>
            <input id="email" type="email" class="field-input" formControlName="email" autocomplete="email" inputmode="email" />
            @if (showError(form.controls.email)) {
              <p class="field-error">Ingresa un email válido.</p>
            }
          </div>
          @if (error()) {
            <p class="alert-error" role="alert">{{ error() }}</p>
          }
          <button type="submit" class="btn btn-primary w-full" [disabled]="loading()">
            {{ loading() ? 'Enviando…' : 'Enviar enlace' }}
          </button>
        </form>
      }
      <p footer class="mt-6 text-sm text-muted">
        <a routerLink="/login" class="font-semibold text-brand-700 hover:underline">Volver a iniciar sesión</a>
      </p>
    </app-auth-shell>
  `,
})
export class ForgotPassword {
  private readonly auth = inject(AuthService);

  protected readonly showError = showError;
  protected readonly loading = signal(false);
  protected readonly sent = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
  });

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.auth.sendPasswordReset(this.form.getRawValue().email);
      this.sent.set(true);
    } catch (e) {
      this.error.set(authErrorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }
}
