import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { PetsRepository } from '../../core/data/pets.repository';
import { PublicPetRepository } from '../../core/data/public-pet.repository';
import { Icon } from '../../shared/ui/icon';
import { Logo } from '../../shared/ui/logo';
import { PetForm } from '../pets/pet-form/pet-form';

type Step = 'loading' | 'not_found' | 'error' | 'blocked' | 'taken' | 'owned' | 'account' | 'pet';

/**
 * /activate/:qrToken — the buyer links a generic PetID to their account and pet.
 * The database enforces "first activation wins"; this screen only guides the steps.
 */
@Component({
  selector: 'app-activate',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, Logo, PetForm],
  template: `
    <header class="border-b border-slate-900/5 bg-surface/85">
      <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <app-logo />
        @if (auth.isAuthenticated()) {
          <a routerLink="/dashboard" class="btn btn-ghost btn-sm">Mis mascotas</a>
        }
      </div>
    </header>

    <main class="mx-auto max-w-5xl px-4 pb-16 pt-8">
      @if (showSteps()) {
        <ol class="mx-auto mb-8 flex max-w-md items-center gap-2 text-xs font-semibold sm:text-sm" aria-label="Pasos de activación">
          @for (s of steps; track s.label; let i = $index) {
            <li class="flex flex-1 items-center gap-2" [class.text-muted]="i > currentStep()">
              <span class="grid size-7 shrink-0 place-items-center rounded-full"
                [class]="i < currentStep() ? 'bg-brand-600 text-white' : i === currentStep() ? 'bg-brand-100 text-brand-800 ring-2 ring-brand-500' : 'bg-slate-100'">
                @if (i < currentStep()) { <app-icon name="check" class="size-4" /> } @else { {{ i + 1 }} }
              </span>
              <span class="truncate">{{ s.label }}</span>
            </li>
          }
        </ol>
      }

      @switch (step()) {
        @case ('loading') {
          <div class="card mx-auto h-72 max-w-md animate-pulse bg-white/60"></div>
        }

        @case ('account') {
          <div class="card mx-auto max-w-md p-6 text-center sm:p-8">
            <div class="mx-auto grid size-16 place-items-center rounded-2xl bg-brand-600 text-white">
              <app-icon name="paw" class="size-8" />
            </div>
            <h1 class="mt-5 text-2xl font-bold tracking-tight">Activa tu PetID</h1>
            <p class="mt-1 text-muted">Crea tu cuenta o inicia sesión para vincular <strong class="text-ink">{{ code() }}</strong> a tu mascota.</p>
            <div class="mt-6 space-y-2">
              <a routerLink="/register" [queryParams]="{ returnUrl: returnUrl() }" class="btn btn-primary w-full py-4">Crear cuenta</a>
              <a routerLink="/login" [queryParams]="{ returnUrl: returnUrl() }" class="btn btn-secondary w-full py-4">Ya tengo cuenta · Iniciar sesión</a>
            </div>
            <p class="mt-5 text-xs text-muted">Tus datos privados nunca se muestran al escanear el QR.</p>
          </div>
        }

        @case ('pet') {
          <div class="mb-6 text-center">
            <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">🐾 Registra a tu mascota</h1>
            <p class="mt-1 text-muted">Al guardar, la PetID <strong class="text-ink">{{ code() }}</strong> quedará vinculada a tu mascota.</p>
          </div>
          <app-pet-form [activationToken]="qrToken()" />
        }

        @case ('owned') {
          <div class="card mx-auto max-w-md p-6 text-center sm:p-8">
            <span class="text-5xl">🎉</span>
            <h1 class="mt-4 text-2xl font-bold">Esta PetID ya es tuya</h1>
            <p class="mt-1 text-muted">Ya está activa y vinculada a tu mascota.</p>
            <a routerLink="/dashboard" class="btn btn-primary mt-6 w-full">Ir a mis mascotas</a>
          </div>
        }

        @case ('taken') {
          <div class="card mx-auto max-w-md p-6 text-center sm:p-8">
            <span class="mx-auto grid size-14 place-items-center rounded-full bg-slate-100 text-slate-600">
              <app-icon name="lock" class="size-7" />
            </span>
            <h1 class="mt-4 text-2xl font-bold">Esta PetID ya está activada.</h1>
            <p class="mt-1 text-muted">Pertenece a otra cuenta y no se puede volver a activar.</p>
            <a [routerLink]="['/p', qrToken()]" class="btn btn-secondary mt-6 w-full">Ver perfil público</a>
          </div>
        }

        @case ('blocked') {
          <div class="card mx-auto max-w-md p-6 text-center sm:p-8">
            <h1 class="text-2xl font-bold">Esta PetID está bloqueada</h1>
            <p class="mt-1 text-muted">No se puede activar. Si compraste este collar, escríbenos para ayudarte.</p>
          </div>
        }

        @case ('not_found') {
          <div class="card mx-auto max-w-md p-6 text-center sm:p-8">
            <h1 class="text-2xl font-bold">No encontramos esta PetID</h1>
            <p class="mt-1 text-muted">Revisa que el enlace del QR esté completo.</p>
            <a routerLink="/" class="btn btn-secondary mt-6">Ir al inicio</a>
          </div>
        }

        @case ('error') {
          <div class="card mx-auto max-w-md p-6 text-center sm:p-8">
            <h1 class="text-2xl font-bold">No pudimos cargar la activación</h1>
            <p class="mt-1 text-muted">Revisa tu conexión e inténtalo de nuevo.</p>
            <button type="button" class="btn btn-primary mt-6" (click)="ngOnInit()">Reintentar</button>
          </div>
        }
      }
    </main>
  `,
})
export class Activate implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly publicRepo = inject(PublicPetRepository);
  private readonly petsRepo = inject(PetsRepository);

  readonly qrToken = input.required<string>();

  protected readonly steps = [{ label: 'Tu cuenta' }, { label: 'Tu mascota' }, { label: '¡Activada!' }];
  protected readonly step = signal<Step>('loading');
  protected readonly code = signal('');
  protected readonly returnUrl = computed(() => `/activate/${this.qrToken()}`);
  protected readonly showSteps = computed(() => this.step() === 'account' || this.step() === 'pet');
  protected readonly currentStep = computed(() => (this.step() === 'pet' ? 1 : 0));

  async ngOnInit() {
    this.step.set('loading');
    try {
      await this.auth.ready;
      const state = await this.publicRepo.getByToken(this.qrToken());
      if (!state) return this.step.set('not_found');
      if (state.status === 'blocked') return this.step.set('blocked');
      if (state.status === 'unactivated') {
        this.code.set(state.code);
        return this.step.set(this.auth.isAuthenticated() ? 'pet' : 'account');
      }
      const owned = await this.petsRepo.findOwnedPetId(this.qrToken());
      this.step.set(owned ? 'owned' : 'taken');
    } catch {
      this.step.set('error');
    }
  }
}
