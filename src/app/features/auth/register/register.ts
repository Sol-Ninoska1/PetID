import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { authErrorMessage } from '../../../core/auth/auth-errors';
import { AuthService, safeReturnUrl } from '../../../core/auth/auth.service';
import { PHONE_PATTERN } from '../../../shared/utils/contact';
import { matchFields, showError } from '../../../shared/utils/validators';
import { AuthShell } from '../auth-shell';
import { PasswordField } from '../../../shared/ui/password-field';

@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthShell, PasswordField],
  templateUrl: './register.html',
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly returnUrl = input<string>();

  protected readonly activating = computed(() => this.returnUrl()?.startsWith('/activate/') ?? false);
  protected readonly showError = showError;
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly needsConfirmation = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      name: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
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
      const { name, email, phone, password } = this.form.getRawValue();
      const target = safeReturnUrl(this.returnUrl());
      const hasSession = await this.auth.signUp({ name, email, phone, password }, target);
      if (hasSession) {
        await this.router.navigateByUrl(target);
      } else {
        this.needsConfirmation.set(true);
      }
    } catch (e) {
      this.error.set(authErrorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }
}
