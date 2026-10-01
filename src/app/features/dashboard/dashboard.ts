import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { PetsRepository } from '../../core/data/pets.repository';
import { PetWithStats } from '../../core/models';
import { Icon } from '../../shared/ui/icon';
import { QrScanner } from '../../shared/ui/qr-scanner';
import { extractQrToken, publicPetIdUrl } from '../../shared/utils/qr-label';
import { PetCard } from './pet-card';
import { PushCard } from './push-card';

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, PetCard, PushCard, QrScanner],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly petsRepo = inject(PetsRepository);
  private readonly router = inject(Router);

  /** Query param set right after activating a PetID. */
  readonly activated = input<string>();
  /** Query param from the landing's "Activar mi PetID" button: opens the activation box. */
  readonly activar = input<string>();

  protected readonly publicPetIdUrl = publicPetIdUrl;

  protected readonly pets = signal<PetWithStats[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busyPetId = signal<string | null>(null);
  protected readonly showActivate = signal(false);
  protected readonly scanning = signal(false);
  protected readonly showPaste = signal(false);
  protected readonly activateInput = signal('');
  protected readonly activateError = signal<string | null>(null);

  protected readonly firstName = computed(() => this.auth.profile()?.name.split(' ')[0] ?? '');
  protected readonly activatedPet = computed(() => this.pets().find((p) => p.id === this.activated()) ?? null);

  async ngOnInit() {
    if (this.activar()) this.showActivate.set(true);
    try {
      this.pets.set(await this.petsRepo.listMine());
    } catch {
      this.error.set('No pudimos cargar tus mascotas. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      this.loading.set(false);
    }
  }

  async onScanned(token: string) {
    this.scanning.set(false);
    await this.router.navigate(['/activate', token]);
  }

  pasteLink() {
    this.scanning.set(false);
    this.showPaste.set(true);
    this.showActivate.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async goToActivation(event: Event) {
    event.preventDefault();
    const token = extractQrToken(this.activateInput());
    if (!token) {
      this.activateError.set('Pega el enlace completo que aparece al escanear el QR de tu collar.');
      return;
    }
    await this.router.navigate(['/activate', token]);
  }

  async toggleLost(pet: PetWithStats) {
    await this.patchPet(pet, { isLost: !pet.isLost }, () => this.petsRepo.setLost(pet.id, !pet.isLost));
  }

  async toggleActive(pet: PetWithStats) {
    await this.patchPet(pet, { isActive: !pet.isActive }, () => this.petsRepo.setActive(pet.id, !pet.isActive));
  }

  /** Optimistic update: reverts the card if the request fails. */
  private async patchPet(pet: PetWithStats, patch: Partial<PetWithStats>, request: () => Promise<void>) {
    this.busyPetId.set(pet.id);
    this.pets.update((list) => list.map((p) => (p.id === pet.id ? { ...p, ...patch } : p)));
    try {
      await request();
    } catch {
      this.pets.update((list) => list.map((p) => (p.id === pet.id ? pet : p)));
      this.error.set('No pudimos guardar el cambio. Inténtalo de nuevo.');
    } finally {
      this.busyPetId.set(null);
    }
  }
}
