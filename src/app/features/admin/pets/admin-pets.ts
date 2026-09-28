import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminPetRow, AdminRepository } from '../../../core/data/admin.repository';
import { SPECIES_EMOJI, SPECIES_LABELS } from '../../../core/models';
import { Icon } from '../../../shared/ui/icon';
import { PetStatusBadge } from '../../../shared/ui/pet-status-badge';
import { AdminTable } from '../ui/admin-table';

@Component({
  selector: 'app-admin-pets',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, Icon, PetStatusBadge, AdminTable],
  template: `
    <h1 class="page-title">Mascotas</h1>
    <p class="mt-1 text-muted">Mascotas registradas por sus dueños al activar una PetID.</p>

    <app-admin-table class="mt-6" [loading]="loading()" [error]="error()" [empty]="!items().length" emptyText="Aún no hay mascotas registradas.">
      <thead>
        <tr><th>Mascota</th><th>Estado</th><th>PetID</th><th>Propietario</th><th>Registrada</th><th class="text-right">Perfil</th></tr>
      </thead>
      <tbody>
        @for (pet of items(); track pet.id) {
          <tr>
            <td>
              <div class="flex items-center gap-3">
                <span class="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-50">
                  @if (pet.photoUrl) {
                    <img [src]="pet.photoUrl" alt="" class="size-full object-cover" loading="lazy" />
                  } @else {
                    {{ speciesEmoji[pet.species] }}
                  }
                </span>
                <div>
                  <p class="font-semibold">{{ pet.name }}</p>
                  <p class="text-xs text-muted">{{ speciesLabels[pet.species] }}{{ pet.breed ? ' · ' + pet.breed : '' }}</p>
                </div>
              </div>
            </td>
            <td><app-pet-status-badge [isLost]="pet.isLost" [isActive]="pet.isActive" /></td>
            <td class="font-semibold tracking-wider">{{ pet.petIdCode ?? '—' }}</td>
            <td>
              <span class="block">{{ pet.ownerName ?? '—' }}</span>
              <span class="block text-xs text-muted">{{ pet.ownerEmail }}</span>
            </td>
            <td class="whitespace-nowrap text-muted">{{ pet.createdAt | date: 'dd/MM/yy' }}</td>
            <td class="text-right">
              @if (pet.petIdQrToken) {
                <a [routerLink]="['/p', pet.petIdQrToken]" target="_blank" class="btn btn-ghost btn-sm" [attr.aria-label]="'Ver perfil de ' + pet.name">
                  <app-icon name="external-link" class="size-4" />
                </a>
              }
            </td>
          </tr>
        }
      </tbody>
    </app-admin-table>
  `,
})
export class AdminPets implements OnInit {
  private readonly repo = inject(AdminRepository);

  protected readonly speciesLabels = SPECIES_LABELS;
  protected readonly speciesEmoji = SPECIES_EMOJI;
  protected readonly items = signal<AdminPetRow[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  async ngOnInit() {
    try {
      this.items.set(await this.repo.listPets());
    } catch {
      this.error.set('No pudimos cargar las mascotas.');
    } finally {
      this.loading.set(false);
    }
  }
}
