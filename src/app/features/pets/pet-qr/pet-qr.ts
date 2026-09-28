import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PetsRepository } from '../../../core/data/pets.repository';
import { Pet } from '../../../core/models';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';
import { Icon } from '../../../shared/ui/icon';
import { PetIdStatusBadge } from '../../../shared/ui/pet-id-status-badge';
import { QrCard } from '../../../shared/ui/qr-card';

@Component({
  selector: 'app-pet-qr',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, QrCard, PetIdStatusBadge, RelativeTimePipe],
  template: `
    <a routerLink="/dashboard" class="btn btn-ghost btn-sm -ml-3 mb-2">
      <app-icon name="arrow-left" class="size-4" /> Mis mascotas
    </a>

    @if (pet(); as pet) {
      <div class="mx-auto max-w-md">
        <h1 class="text-2xl font-bold tracking-tight">PetID de {{ pet.name }}</h1>

        @if (pet.petId; as petId) {
          <div class="card mt-4 flex items-center justify-between gap-3 p-4">
            <div>
              <p class="text-xs text-muted">Código</p>
              <p class="text-lg font-extrabold tracking-wider">{{ petId.code }}</p>
              @if (petId.activatedAt) {
                <p class="text-xs text-muted">Activada {{ petId.activatedAt | relativeTime }}</p>
              }
            </div>
            <app-pet-id-status-badge [status]="petId.status" />
          </div>

          <app-qr-card class="mt-4 block" [code]="petId.code" [qrToken]="petId.qrToken" />

          <a [routerLink]="['/p', petId.qrToken]" target="_blank" class="btn btn-secondary mt-4 w-full">
            <app-icon name="eye" class="size-5" /> Ver perfil público
          </a>
          <p class="mt-6 text-center text-xs text-muted">
            Este es el mismo QR de tu collar. Solo contiene el enlace, así que puedes cambiar los datos de {{ pet.name }}
            cuando quieras sin reemplazar el collar.
          </p>
        } @else {
          <p class="alert-error mt-4">Esta mascota no tiene una PetID vinculada.</p>
        }
      </div>
    } @else if (error()) {
      <p class="alert-error">{{ error() }}</p>
    } @else {
      <div class="card mx-auto h-96 max-w-md animate-pulse bg-white/60"></div>
    }
  `,
})
export class PetQr implements OnInit {
  private readonly petsRepo = inject(PetsRepository);

  readonly id = input.required<string>();

  protected readonly pet = signal<Pet | null>(null);
  protected readonly error = signal<string | null>(null);

  async ngOnInit() {
    try {
      this.pet.set((await this.petsRepo.getById(this.id())).pet);
    } catch {
      this.error.set('No encontramos esta mascota.');
    }
  }
}
