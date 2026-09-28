import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon } from '../../shared/ui/icon';
import { telHref, whatsappHref } from '../../shared/utils/contact';

/** Call / WhatsApp buttons. Only rendered when the owner chose to show their phone. */
@Component({
  selector: 'app-contact-owner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  host: { class: 'block' },
  template: `
    @if (phone(); as phone) {
      <div class="grid grid-cols-2 gap-3">
        <a class="group flex items-center justify-center gap-3 rounded-2xl bg-brand-600 p-3 text-white shadow-md shadow-brand-900/20 transition hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-lg active:translate-y-0"
          [href]="callHref()">
          <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-white/15 transition group-hover:bg-white/25">
            <app-icon name="phone" class="size-5" />
          </span>
          <span class="font-bold">Llamar</span>
        </a>
        <a class="group flex items-center justify-center gap-3 rounded-2xl bg-[#25D366] p-3 text-white shadow-md shadow-green-900/20 transition hover:-translate-y-0.5 hover:bg-[#1ebe5b] hover:shadow-lg active:translate-y-0"
          [href]="whatsappLink()" target="_blank" rel="noopener">
          <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-white/20 transition group-hover:bg-white/30">
            <app-icon name="message" class="size-5" />
          </span>
          <span class="font-bold">WhatsApp</span>
        </a>
      </div>
    }
  `,
})
export class ContactOwner {
  readonly phone = input<string | null>(null);
  readonly petName = input.required<string>();

  protected readonly callHref = computed(() => telHref(this.phone() ?? ''));
  protected readonly whatsappLink = computed(() =>
    whatsappHref(this.phone() ?? '', `¡Hola! Escaneé la placa de ${this.petName()} y quiero ayudar a que vuelva a casa.`),
  );
}
