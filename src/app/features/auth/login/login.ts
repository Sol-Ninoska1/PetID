import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { authErrorMessage } from '../../../core/auth/auth-errors';
import { AuthService, safeReturnUrl } from '../../../core/auth/auth.service';
import { showError } from '../../../shared/utils/validators';
import { AuthShell } from '../auth-shell';
import { PasswordField } from '../../../shared/ui/password-field';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthShell, PasswordField],
  template: `
    <app-auth-shell heading="Hola de nuevo 👋" [subheading]="activating() ? 'Ingresa para activar tu PetID.' : 'Ingresa para ver a tus mascotas.'">
      @if (activating()) {
        <p class="alert-success mb-4">🐾 Después de iniciar sesión registrarás a tu mascota y tu PetID quedará activa.</p>
      }
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4" novalidate>
        <div>
          <label class="field-label" for="email">Email</label>
          <input id="email" type="email" class="field-input" formControlName="email" autocomplete="email" inputmode="email" placeholder="tu@email.com" />
          @if (showError(form.controls.email)) {
            <p class="field-error">Ingresa un email válido.</p>
          }
        </div>

        <div>
          <label class="field-label" for="password">Contraseña</label>
          <app-password-field>
            <input id="password" type="password" class="field-input pr-11" formControlName="password" autocomplete="current-password" />
          </app-password-field>
          @if (showError(form.controls.password)) {
            <p class="field-error">Ingresa tu contraseña.</p>
          }
        </div>

        <div class="flex items-center justify-between text-sm">
          <label class="inline-flex items-center gap-2 text-slate-700">
            <input type="checkbox" formControlName="remember" class="size-4 rounded accent-brand-600" />
            Recordar sesión
          </label>
          <a routerLink="/forgot-password" class="font-semibold text-brand-700 hover:underline">¿Olvidaste tu contraseña?</a>
        </div>

        @if (error()) {
          <p class="alert-error" role="alert">{{ error() }}</p>
        }

        <button type="submit" class="btn btn-primary w-full" [disabled]="loading()">
          {{ loading() ? 'Ingresando…' : 'Iniciar sesión' }}
        </button>
      </form>

      <p footer class="mt-6 text-sm text-muted">
        ¿Aún no tienes cuenta?
        <a routerLink="/register" [queryParams]="returnUrl() ? { returnUrl: returnUrl() } : {}" class="font-semibold text-brand-700 hover:underline">Regístrate</a>
      </p>
    </app-auth-shell>
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly returnUrl = input<string>();

  protected readonly activating = computed(() => this.returnUrl()?.startsWith('/activate/') ?? false);
  protected readonly showError = showError;
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    remember: [true],
  });

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      const { email, password, remember } = this.form.getRawValue();
      await this.auth.signIn(email, password, remember);
      await this.router.navigateByUrl(safeReturnUrl(this.returnUrl()));
    } catch (e) {
      this.error.set(authErrorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }
}
