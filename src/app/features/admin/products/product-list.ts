import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductsRepository } from '../../../core/data/products.repository';
import { Product, PRODUCT_TYPE_LABELS, totalStock } from '../../../core/models';
import { Icon } from '../../../shared/ui/icon';
import { formatClp } from '../../../shared/utils/money';
import { AdminTable } from '../ui/admin-table';

@Component({
  selector: 'app-product-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, AdminTable],
  template: `
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="page-title">Productos</h1>
        <p class="mt-1 text-muted">Catálogo de collares, placas y tags. Los activos se muestran en la página principal.</p>
      </div>
      <a routerLink="/admin/products/new" class="btn btn-primary">
        <app-icon name="plus" class="size-5" /> Nuevo producto
      </a>
    </div>

    @if (actionError()) {
      <p class="alert-error mt-4">{{ actionError() }}</p>
    }

    <app-admin-table class="mt-6" [loading]="loading()" [error]="error()" [empty]="!items().length"
      emptyText="Aún no hay productos. Crea el primero con “Nuevo producto”.">
      <thead>
        <tr><th>Producto</th><th>Precio</th><th>Variantes</th><th>Stock</th><th>Visible</th><th class="text-right">Acciones</th></tr>
      </thead>
      <tbody>
        @for (p of items(); track p.id) {
          <tr [class.opacity-60]="!p.isActive">
            <td>
              <div class="flex items-center gap-3">
                <span class="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand-50 text-brand-700">
                  @if (p.photoUrl) {
                    <img [src]="p.photoUrl" alt="" class="size-full object-cover" loading="lazy" />
                  } @else {
                    <app-icon name="package" class="size-5" />
                  }
                </span>
                <div class="min-w-0">
                  <p class="truncate font-semibold">{{ p.name }}</p>
                  <p class="text-xs text-muted">{{ typeLabels[p.type] }}</p>
                </div>
              </div>
            </td>
            <td class="whitespace-nowrap font-semibold">{{ formatClp(p.priceClp) }}</td>
            <td class="max-w-56">
              <p class="truncate text-sm">{{ variantSummary(p) }}</p>
            </td>
            <td>
              @let stock = totalStock(p);
              <span class="rounded-full px-2.5 py-1 text-xs font-bold"
                [class]="stock === 0 ? 'bg-red-50 text-red-700' : stock < 5 ? 'bg-amber-50 text-amber-800' : 'bg-brand-50 text-brand-800'">
                {{ stock === 0 ? 'Agotado' : stock }}
              </span>
            </td>
            <td>
              <label class="inline-flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" class="size-4 accent-brand-600" [checked]="p.isActive" [disabled]="busyId() === p.id" (change)="toggleActive(p)" />
                {{ p.isActive ? 'Sí' : 'No' }}
              </label>
            </td>
            <td class="text-right">
              <a [routerLink]="['/admin/products', p.id]" class="btn btn-ghost btn-sm" [attr.aria-label]="'Editar ' + p.name">
                <app-icon name="edit" class="size-4" />
              </a>
            </td>
          </tr>
        }
      </tbody>
    </app-admin-table>
  `,
})
export class ProductList implements OnInit {
  private readonly repo = inject(ProductsRepository);

  protected readonly typeLabels = PRODUCT_TYPE_LABELS;
  protected readonly formatClp = formatClp;
  protected readonly totalStock = totalStock;

  protected readonly items = signal<Product[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly busyId = signal<string | null>(null);

  async ngOnInit() {
    try {
      this.items.set(await this.repo.list());
    } catch {
      this.error.set('No pudimos cargar los productos. ¿Aplicaste la migración de productos?');
    } finally {
      this.loading.set(false);
    }
  }

  protected variantSummary(p: Product): string {
    const labels = p.variants.map((v) => [v.color, v.size].filter(Boolean).join(' · ')).filter(Boolean);
    return labels.length ? labels.join(', ') : 'Única';
  }

  async toggleActive(p: Product) {
    this.busyId.set(p.id);
    this.actionError.set(null);
    try {
      await this.repo.setActive(p.id, !p.isActive);
      this.items.update((list) => list.map((x) => (x.id === p.id ? { ...x, isActive: !p.isActive } : x)));
    } catch {
      this.actionError.set('No pudimos cambiar la visibilidad del producto.');
    } finally {
      this.busyId.set(null);
    }
  }
}
