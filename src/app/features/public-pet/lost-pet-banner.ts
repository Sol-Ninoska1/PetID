import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PetSex } from '../../core/models';

@Component({
  selector: 'app-lost-pet-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="bg-red-600 px-4 py-3 text-center text-white" role="alert">
      <p class="text-lg font-extrabold uppercase tracking-wide">🚨 {{ headline() }}</p>
      <p class="text-sm text-red-100">Su familia la está buscando. ¡Gracias por ayudar!</p>
    </div>
  `,
})
export class LostPetBanner {
  readonly name = input.required<string>();
  readonly sex = input<PetSex>('unknown');

  protected readonly headline = computed(() => {
    const lost = this.sex() === 'female' ? 'perdida' : this.sex() === 'male' ? 'perdido' : 'perdido/a';
    return `${this.name()} está ${lost}`;
  });
}
