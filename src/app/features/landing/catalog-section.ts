import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CatalogProduct, PRODUCT_TYPE_LABELS } from '../../core/models';
import { Icon } from '../../shared/ui/icon';
import { formatClp } from '../../shared/utils/money';

const unique = (values: (string | null)[]) => [...new Set(values.filter((v): v is string => !!v))];

/** Public product showcase on the landing (no cart or checkout yet). */
@Component({
  selector: 'app-catalog-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <h2 class="text-center text-3xl font-bold tracking-tight">Nuestros productos</h2>
    <p class="mx-auto mt-2 max-w-lg text-center text-muted">Cada uno incluye su PetID con código QR único, lista para activar.</p>
    <div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      @for (p of products(); track p.id) {
        @let available = isAvailable(p);
        <article class="card flex flex-col overflow-hidden">
          <div class="relative aspect-[4/3] bg-brand-50">
            @if (p.photoUrl) {
              <img [src]="p.photoUrl" [alt]="p.name" class="size-full object-cover" loading="lazy" />
            } @else {
              <div class="grid size-full place-items-center text-brand-700"><app-icon name="package" class="size-12" /></div>
            }
            <span class="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-brand-800 shadow-sm">
              {{ typeLabels[p.type] }}
            </span>
            @if (!available) {
              <span class="absolute right-3 top-3 rounded-full bg-ink px-3 py-1 text-xs font-bold text-white">Agotado</span>
            }
          </div>
          <div class="flex flex-1 flex-col p-5">
            <div class="flex items-start justify-between gap-3">
              <h3 class="text-lg font-bold">{{ p.name }}</h3>
              <p class="shrink-0 text-lg font-extrabold text-brand-700">{{ formatClp(p.priceClp) }}</p>
            </div>
            @if (p.description) {
              <p class="mt-2 line-clamp-3 text-sm text-muted">{{ p.description }}</p>
            }
            @if (colors(p).length) {
              <div class="mt-4">
                <p class="text-xs font-semibold uppercase tracking-wide text-muted">Colores</p>
                <div class="mt-1.5 flex flex-wrap gap-1.5">
                  @for (c of colors(p); track c) {
                    <span class="rounded-full bg-surface px-2.5 py-1 text-xs font-medium ring-1 ring-slate-200">{{ c }}</span>
                  }
                </div>
              </div>
            }
            @if (sizes(p).length) {
              <div class="mt-3">
                <p class="text-xs font-semibold uppercase tracking-wide text-muted">Tallas</p>
                <div class="mt-1.5 flex flex-wrap gap-1.5">
                  @for (s of sizes(p); track s) {
                    <span class="rounded-full bg-surface px-2.5 py-1 text-xs font-medium ring-1 ring-slate-200">{{ s }}</span>
                  }
                </div>
              </div>
            }
          </div>
        </article>
      }
    </div>
  `,
})
export class CatalogSection {
  readonly products = input.required<CatalogProduct[]>();

  protected readonly typeLabels = PRODUCT_TYPE_LABELS;
  protected readonly formatClp = formatClp;

  protected isAvailable = (p: CatalogProduct) => p.variants.some((v) => v.inStock);
  protected colors = (p: CatalogProduct) => unique(p.variants.map((v) => v.color));
  protected sizes = (p: CatalogProduct) => unique(p.variants.map((v) => v.size));
}
