import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { PublicPetRepository } from '../../core/data/public-pet.repository';
import { PublicPetIdState, SEX_LABELS, SPECIES_EMOJI, SPECIES_LABELS } from '../../core/models';
import { Icon, IconName } from '../../shared/ui/icon';
import { GEOLOCATION_MESSAGES, GeolocationError, getCurrentPosition } from '../../shared/utils/geolocation';
import { fetchIpLocation } from '../../shared/utils/ip-location';
import { petAge } from '../../shared/utils/pet';
import { ContactOwner } from './contact-owner';
import { FoundReportForm } from './found-report-form';
import { LostPetBanner } from './lost-pet-banner';

type LocationState = 'idle' | 'sending' | 'sent' | 'error';

/** /p/:qrToken — what anyone sees after scanning a PetID. No login required. */
@Component({
  selector: 'app-public-pet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, FoundReportForm, LostPetBanner, ContactOwner],
  templateUrl: './public-pet.html',
})
export class PublicPetPage implements OnInit {
  private readonly repo = inject(PublicPetRepository);
  private readonly title = inject(Title);

  readonly qrToken = input.required<string>();

  protected readonly speciesLabels = SPECIES_LABELS;
  protected readonly speciesEmoji = SPECIES_EMOJI;
  protected readonly sexLabels = SEX_LABELS;

  protected readonly state = signal<PublicPetIdState | null>(null);
  protected readonly status = signal<'loading' | 'ready' | 'not_found' | 'error'>('loading');
  protected readonly showFoundForm = signal(false);
  protected readonly locationState = signal<LocationState>('idle');
  protected readonly locationError = signal<string | null>(null);
  /** True while the automatic request (lost pets) is pending, so the page can explain the browser prompt. */
  protected readonly autoLocating = signal(false);
  private scanId: Promise<string | null> = Promise.resolve(null);

  protected readonly pet = computed(() => {
    const s = this.state();
    return s?.status === 'active' ? s.pet : null;
  });

  protected readonly unactivatedCode = computed(() => {
    const s = this.state();
    return s?.status === 'unactivated' ? s.code : null;
  });

  protected readonly details = computed(() => {
    const p = this.pet();
    if (!p) return [];
    const details: { label: string; value: string | null; icon: IconName }[] = [
      { label: 'Especie', value: this.speciesLabels[p.species], icon: 'bone' },
      { label: 'Raza', value: p.breed, icon: 'paw' },
      { label: 'Sexo', value: p.sex === 'unknown' ? null : this.sexLabels[p.sex], icon: 'gender' },
      { label: 'Color', value: p.color, icon: 'dog' },
      { label: 'Edad', value: petAge(p.birthDate), icon: 'calendar' },
      { label: 'Peso', value: p.weight ? `${p.weight} kg` : null, icon: 'weight' },
    ];
    return details.filter((d) => d.value);
  });

  protected readonly healthInfo = computed(() => {
    const p = this.pet();
    if (!p) return [];
    return [
      { label: 'Alergias', value: p.allergies },
      { label: 'Medicamentos', value: p.medications },
      { label: 'Necesidades especiales', value: p.specialNeeds },
    ].filter((d) => d.value);
  });

  async ngOnInit() {
    this.status.set('loading');
    try {
      const state = await this.repo.getByToken(this.qrToken());
      if (!state) {
        this.status.set('not_found');
        return;
      }
      this.state.set(state);
      this.status.set('ready');
      if (state.status === 'active') {
        this.title.setTitle(state.pet.isLost ? `🚨 ${state.pet.name} está perdido — PetID` : `${state.pet.name} — PetID`);
      } else if (state.status === 'unactivated') {
        this.title.setTitle('Activa tu PetID');
      }
      const token = this.qrToken();
      this.scanId = fetchIpLocation()
        .then((geo) => this.repo.recordScan(token, geo))
        .catch(() => null);
      if (state.status === 'active' && state.pet.isLost && this.locationState() === 'idle') {
        void this.sendLocation(true);
      }
    } catch {
      this.status.set('error');
    }
  }

  /** `auto`: requested on page load for lost pets; a refusal is silent and the button stays available. */
  async sendLocation(auto = false) {
    this.locationState.set('sending');
    this.locationError.set(null);
    this.autoLocating.set(auto);
    try {
      const { coords } = await getCurrentPosition();
      await this.repo.shareLocation(
        this.qrToken(),
        await this.scanId,
        { lat: coords.latitude, lng: coords.longitude },
        coords.accuracy,
      );
      this.locationState.set('sent');
    } catch (e) {
      if (auto) {
        this.locationState.set('idle');
        return;
      }
      this.locationState.set('error');
      this.locationError.set(
        e instanceof GeolocationError ? GEOLOCATION_MESSAGES[e.reason] : 'No pudimos enviar tu ubicación. Inténtalo de nuevo.',
      );
    } finally {
      this.autoLocating.set(false);
    }
  }
}
