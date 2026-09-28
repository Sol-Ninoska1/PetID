import { ChangeDetectionStrategy, Component, computed, inject, input, isDevMode, OnDestroy, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { PetsRepository } from '../../../core/data/pets.repository';
import { EmergencyContactInput, PetInput, PetSex, PetSpecies, SEX_LABELS, SPECIES_EMOJI, SPECIES_LABELS } from '../../../core/models';
import { Icon } from '../../../shared/ui/icon';
import { ImageCropper } from '../../../shared/ui/image-cropper';
import { PHONE_PATTERN } from '../../../shared/utils/contact';
import { EditablePhoto } from '../../../shared/utils/editable-photo';
import { notInFuture, showError } from '../../../shared/utils/validators';

type PhotoKind = 'photo' | 'cover';

/** Must match how each image is displayed on the public profile. */
const CROP_SETTINGS: Record<PhotoKind, { label: string; aspect: number; outputWidth: number; heading: string; hint: string }> = {
  photo: { label: 'Foto de perfil', aspect: 1, outputWidth: 1080, heading: 'Ajusta la foto', hint: 'su cara' },
  cover: { label: 'Portada', aspect: 5 / 2, outputWidth: 1600, heading: 'Ajusta la portada', hint: 'lo que quieres mostrar' },
};

const ACTIVATION_ERRORS: [RegExp, string][] = [
  [/pet_id_already_activated/, 'Esta PetID ya está activada.'],
  [/pet_id_blocked/, 'Esta PetID está bloqueada. Escríbenos para ayudarte.'],
  [/pet_id_not_found/, 'No encontramos esta PetID. Revisa el enlace del QR.'],
];

function saveErrorMessage(e: unknown): string {
  const message = (e as { message?: string } | null)?.message ?? '';
  const known = ACTIVATION_ERRORS.find(([pattern]) => pattern.test(message))?.[1];
  if (known) return known;
  const generic = 'No pudimos guardar la mascota. Revisa tu conexión e inténtalo de nuevo.';
  return isDevMode() && message ? `${generic} (${message})` : generic;
}

@Component({
  selector: 'app-pet-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, Icon, ImageCropper],
  templateUrl: './pet-form.html',
})
export class PetForm implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly petsRepo = inject(PetsRepository);
  private readonly router = inject(Router);

  /** Route param: present when editing. */
  readonly id = input<string>();
  /** Set by the activation screen: saving creates the pet and links it to this PetID. */
  readonly activationToken = input<string>();

  protected readonly activating = computed(() => !this.id() && !!this.activationToken());
  protected readonly showError = showError;
  protected readonly species = Object.keys(SPECIES_LABELS) as PetSpecies[];
  protected readonly speciesLabels = SPECIES_LABELS;
  protected readonly speciesEmoji = SPECIES_EMOJI;
  protected readonly sexes = Object.keys(SEX_LABELS) as PetSex[];
  protected readonly sexLabels = SEX_LABELS;
  protected readonly today = new Date().toISOString().slice(0, 10);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly photo = new EditablePhoto();
  protected readonly cover = new EditablePhoto();
  protected readonly cropping = signal<PhotoKind | null>(null);
  protected readonly cropSettings = CROP_SETTINGS;
  protected readonly photoKinds: PhotoKind[] = ['photo', 'cover'];

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    species: ['dog' as PetSpecies, Validators.required],
    breed: ['', Validators.maxLength(80)],
    sex: ['unknown' as PetSex],
    birthDate: ['', notInFuture],
    color: ['', Validators.maxLength(60)],
    weight: [null as number | null, [Validators.min(0.1), Validators.max(199)]],
    description: ['', Validators.maxLength(1000)],
    allergies: ['', Validators.maxLength(500)],
    medications: ['', Validators.maxLength(500)],
    specialNeeds: ['', Validators.maxLength(500)],
    showHealthInfo: [true],
    showContactPhone: [true],
    isActive: [true],
    isLost: [false],
    contactName: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/\S/)]],
    contactPhone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
    contactRelationship: ['', Validators.maxLength(60)],
  });

  async ngOnInit() {
    const id = this.id();
    if (!id) return;
    this.loading.set(true);
    try {
      const { pet, emergencyContact } = await this.petsRepo.getById(id);
      this.photo.setSaved(pet.photoUrl);
      this.cover.setSaved(pet.coverUrl);
      this.form.patchValue({
        ...pet,
        breed: pet.breed ?? '',
        birthDate: pet.birthDate ?? '',
        color: pet.color ?? '',
        description: pet.description ?? '',
        allergies: pet.allergies ?? '',
        medications: pet.medications ?? '',
        specialNeeds: pet.specialNeeds ?? '',
        contactName: emergencyContact?.name ?? '',
        contactPhone: emergencyContact?.phone ?? '',
        contactRelationship: emergencyContact?.relationship ?? '',
      });
    } catch {
      this.error.set('No encontramos esta mascota.');
    } finally {
      this.loading.set(false);
    }
  }

  ngOnDestroy() {
    this.photo.destroy();
    this.cover.destroy();
  }

  protected slot(kind: PhotoKind): EditablePhoto {
    return kind === 'photo' ? this.photo : this.cover;
  }

  protected onFileSelected(kind: PhotoKind, event: Event) {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    inputEl.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.error.set('El archivo debe ser una imagen.');
      return;
    }
    this.slot(kind).pick(file);
    this.cropping.set(kind);
  }

  /** Opens the cropper on the last picked file, or on the saved image when editing. */
  protected async adjust(kind: PhotoKind) {
    try {
      if (await this.slot(kind).ensureSource()) this.cropping.set(kind);
    } catch {
      this.error.set('No pudimos cargar la imagen actual. Prueba eligiéndola de nuevo con "Cambiar".');
    }
  }

  protected onCropped(kind: PhotoKind, blob: Blob) {
    this.slot(kind).setCropped(blob);
    this.cropping.set(null);
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Revisa los campos marcados.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    try {
      const v = this.form.getRawValue();
      const upload = (blob: Blob) => this.petsRepo.uploadPhoto(this.auth.userId()!, blob);
      const [photoUrl, coverUrl] = await Promise.all([this.photo.resolveUrl(upload), this.cover.resolveUrl(upload)]);

      const pet: PetInput = {
        name: v.name,
        species: v.species,
        breed: v.breed,
        sex: v.sex,
        birthDate: v.birthDate || null,
        color: v.color,
        weight: v.weight,
        photoUrl,
        coverUrl,
        description: v.description,
        specialNeeds: v.specialNeeds,
        allergies: v.allergies,
        medications: v.medications,
        showHealthInfo: v.showHealthInfo,
        showContactPhone: v.showContactPhone,
        isLost: v.isLost,
        isActive: v.isActive,
      };
      const contact: EmergencyContactInput = {
        name: v.contactName.trim(),
        phone: v.contactPhone.trim(),
        relationship: v.contactRelationship,
      };

      const id = this.id();
      const token = this.activationToken();
      if (id) {
        await this.petsRepo.update(id, pet, contact);
        await this.router.navigateByUrl('/dashboard');
      } else if (token) {
        const petId = await this.petsRepo.activate(token, pet, contact);
        await this.router.navigate(['/dashboard'], { queryParams: { activated: petId } });
      }
    } catch (e) {
      console.error('[PetForm] save failed', e);
      this.error.set(saveErrorMessage(e));
    } finally {
      this.saving.set(false);
    }
  }

  async remove() {
    const id = this.id();
    if (
      !id ||
      !confirm('¿Eliminar esta mascota? Se borrará su historial y su PetID quedará libre: al escanearla se pedirá activarla de nuevo.')
    )
      return;
    this.saving.set(true);
    try {
      await this.petsRepo.remove(id);
      await this.router.navigateByUrl('/dashboard');
    } catch {
      this.error.set('No pudimos eliminar la mascota.');
      this.saving.set(false);
    }
  }
}
