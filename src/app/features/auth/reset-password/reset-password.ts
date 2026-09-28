import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { authErrorMessage } from '../../../core/auth/auth-errors';
import { AuthService } from '../../../core/auth/auth.service';
import { matchFields, showError } from '../../../shared/utils/validators';
import { AuthShell } from '../auth-shell';
import { PasswordField } from '../../../shared/ui/password-field';

/** Landing page of the recovery email link; Supabase restores a temporary session from the URL. */
@Component({
  selector: 'app-reset-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthShell, PasswordField],
  template: `
    <app-auth-shell heading="Nueva contraseña">
      @if (!auth.initialized()) {
        <p class="text-muted">Verificando enlace…</p>
      } @else if (!auth.isAuthenticated()) {
        <div class="alert-error">
          El enlace expiró o no es válido.
          <a routerLink="/forgot-password" class="font-semibold underline">Solicita uno nuevo</a>.
        </div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4" novalidate>
          <div>
            <label class="field-label" for="password">Nueva contraseña</label>
            <app-password-field>
              <input id="password" type="password" class="field-input pr-11" formControlName="password" autocomplete="new-password" placeholder="Mínimo 8 caracteres" />
            </app-password-field>
            @if (showError(form.controls.password)) {
              <p class="field-error">La contraseña debe tener al menos 8 caracteres.</p>
            }
          </div>
          <div>
            <label class="field-label" for="confirmPassword">Confirmar contraseña</label>
            <app-password-field>
              <input id="confirmPassword" type="password" class="field-input pr-11" formControlName="confirmPassword" autocomplete="new-password" />
            </app-password-field>
            @if (form.controls.confirmPassword.touched && form.hasError('mismatch')) {
              <p class="field-error">Las contraseñas no coinciden.</p>
            }
          </div>
          @if (error()) {
            <p class="alert-error" role="alert">{{ error() }}</p>
          }
          <button type="submit" class="btn btn-primary w-full" [disabled]="loading()">
            {{ loading() ? 'Guardando…' : 'Guardar contraseña' }}
          </button>
        </form>
      }
    </app-auth-shell>
  `,
})
export class ResetPassword {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly showError = showError;
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: matchFields('password', 'confirmPassword') },
  );

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.auth.updatePassword(this.form.getRawValue().password);
      await this.router.navigateByUrl('/dashboard');
    } catch (e) {
      this.error.set(authErrorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }
}
