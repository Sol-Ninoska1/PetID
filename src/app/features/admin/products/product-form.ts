import { ChangeDetectionStrategy, Component, computed, inject, input, OnDestroy, OnInit, signal } from '@angular/core';
import { FormArray, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProductsRepository } from '../../../core/data/products.repository';
import { PRODUCT_TYPE_LABELS, PRODUCT_TYPES, ProductType } from '../../../core/models';
import { ConfirmService } from '../../../shared/ui/confirm-dialog';
import { Icon } from '../../../shared/ui/icon';
import { ImageCropper } from '../../../shared/ui/image-cropper';
import { formatClp } from '../../../shared/utils/money';

/** /admin/products/new and /admin/products/:id */
@Component({
  selector: 'app-product-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, Icon, ImageCropper],
  template: `
    <a routerLink="/admin/products" class="btn btn-ghost btn-sm -ml-3 mb-2">
      <app-icon name="arrow-left" class="size-4" /> Productos
    </a>
    <h1 class="page-title">{{ isNew() ? 'Nuevo producto' : 'Editar producto' }}</h1>

    @if (loading()) {
      <div class="card mt-6 h-96 animate-pulse bg-white/60"></div>
    } @else if (notFound()) {
      <p class="alert-error mt-6">No encontramos este producto.</p>
    } @else {
      <form [formGroup]="form" (ngSubmit)="submit()" class="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]" novalidate>
        <div class="card h-fit p-5">
          <label class="group relative block aspect-[4/3] cursor-pointer overflow-hidden rounded-2xl bg-brand-50 ring-1 ring-brand-100">
            @if (photoPreview()) {
              <img [src]="photoPreview()" alt="Foto del producto" class="size-full object-cover" />
            } @else {
              <div class="grid size-full place-items-center text-center text-brand-700">
                <div>
                  <app-icon name="camera" class="mx-auto size-10" />
                  <p class="mt-2 text-sm font-semibold">Agregar foto</p>
                </div>
              </div>
            }
            <span class="absolute inset-x-3 bottom-3 rounded-xl bg-white/90 py-2 text-center text-sm font-semibold opacity-0 shadow transition group-hover:opacity-100">
              Cambiar foto
            </span>
            <input id="product-photo-input" type="file" accept="image/*" class="sr-only" (change)="onPhotoSelected($event)" />
          </label>
          @if (photoPreview()) {
            <div class="mt-3 grid grid-cols-2 gap-2">
              <button type="button" class="btn btn-secondary btn-sm" [disabled]="loadingPhoto()" (click)="adjustPhoto()">
                <app-icon name="edit" class="size-4" /> {{ loadingPhoto() ? 'Cargando…' : 'Ajustar' }}
              </button>
              <label for="product-photo-input" class="btn btn-secondary btn-sm cursor-pointer">
                <app-icon name="camera" class="size-4" /> Cambiar
              </label>
            </div>
            <button type="button" class="btn btn-ghost btn-sm mt-2 w-full" (click)="removePhoto()">Quitar foto</button>
          }
        </div>

        @if (cropping() && originalPhoto(); as file) {
          <app-image-cropper [file]="file" [aspect]="4 / 3" [outputWidth]="1200" heading="Ajusta la foto del producto"
            hint="el producto" (cropped)="onPhotoCropped($event)" (cancelled)="cropping.set(false)" />
        }

        <div class="space-y-6">
          <fieldset class="card space-y-4 p-5">
            <legend class="sr-only">Información del producto</legend>
            <div>
              <label class="field-label" for="name">Nombre *</label>
              <input id="name" class="field-input" formControlName="name" maxlength="120" placeholder="Ej: Collar Nylon Reflectante" />
              @if (form.controls.name.touched && form.controls.name.invalid) {
                <p class="field-error">Ingresa el nombre del producto.</p>
              }
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="field-label" for="type">Tipo *</label>
                <select id="type" class="field-input" formControlName="type">
                  @for (t of types; track t) {
                    <option [value]="t">{{ typeLabels[t] }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="field-label" for="price">Precio (CLP) *</label>
                <input id="price" type="number" inputmode="numeric" min="0" step="1" class="field-input" formControlName="priceClp" placeholder="12990" />
                @if (form.controls.priceClp.touched && form.controls.priceClp.invalid) {
                  <p class="field-error">Ingresa un precio válido, sin puntos ni decimales.</p>
                } @else if (form.controls.priceClp.value > 0) {
                  <p class="mt-1 text-xs text-muted">Se muestra como {{ formatClp(form.controls.priceClp.value) }}</p>
                }
              </div>
            </div>
            <div>
              <label class="field-label" for="description">Descripción</label>
              <textarea id="description" rows="4" class="field-input" formControlName="description" maxlength="2000"
                placeholder="Materiales, medidas, qué incluye…"></textarea>
            </div>
            <label class="flex items-center gap-3 text-sm font-medium">
              <input type="checkbox" class="size-5 accent-brand-600" formControlName="isActive" />
              Visible en la página principal
            </label>
          </fieldset>

          <fieldset class="card p-5">
            <legend class="sr-only">Variantes</legend>
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 class="font-bold">Variantes y stock</h2>
                <p class="text-sm text-muted">Una fila por combinación de color y talla. Deja en blanco lo que no aplique.</p>
              </div>
              <p class="text-sm">Stock total: <strong>{{ stockTotal() }}</strong></p>
            </div>

            <div class="mt-4 space-y-2" formArrayName="variants">
              <div class="hidden grid-cols-[1fr_1fr_110px_40px] gap-2 px-1 text-xs font-semibold text-muted sm:grid">
                <span>Color</span><span>Talla</span><span>Stock</span><span></span>
              </div>
              @for (row of variants.controls; track row; let i = $index) {
                <div class="grid grid-cols-2 gap-2 rounded-2xl bg-surface p-2 sm:grid-cols-[1fr_1fr_110px_40px] sm:bg-transparent sm:p-0" [formGroupName]="i">
                  <input class="field-input" formControlName="color" maxlength="40" placeholder="Ej: Rojo" [attr.aria-label]="'Color variante ' + (i + 1)" />
                  <input class="field-input" formControlName="size" maxlength="20" placeholder="Ej: M" [attr.aria-label]="'Talla variante ' + (i + 1)" />
                  <input class="field-input" type="number" min="0" step="1" inputmode="numeric" formControlName="stock" [attr.aria-label]="'Stock variante ' + (i + 1)" />
                  <button type="button" class="btn btn-ghost btn-sm justify-self-end text-red-600 hover:bg-red-50" [disabled]="variants.length === 1"
                    (click)="removeVariant(i)" [attr.aria-label]="'Quitar variante ' + (i + 1)">
                    <app-icon name="trash" class="size-4" />
                  </button>
                </div>
              }
            </div>
            <button type="button" class="btn btn-secondary btn-sm mt-3" (click)="addVariant()">
              <app-icon name="plus" class="size-4" /> Agregar variante
            </button>
          </fieldset>

          @if (error()) {
            <p class="alert-error" role="alert">{{ error() }}</p>
          }

          <div class="flex flex-wrap items-center justify-between gap-3">
            @if (!isNew()) {
              <button type="button" class="btn btn-ghost text-red-600 hover:bg-red-50" [disabled]="saving()" (click)="remove()">
                <app-icon name="trash" class="size-4" /> Eliminar producto
              </button>
            } @else {
              <span></span>
            }
            <button type="submit" class="btn btn-primary px-8" [disabled]="saving()">
              {{ saving() ? 'Guardando…' : isNew() ? 'Crear producto' : 'Guardar cambios' }}
            </button>
          </div>
        </div>
      </form>
    }
  `,
})
export class ProductForm implements OnInit, OnDestroy {
  private readonly repo = inject(ProductsRepository);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly confirmDialog = inject(ConfirmService);

  /** Route param; absent on /admin/products/new. */
  readonly id = input<string>();

  protected readonly types = PRODUCT_TYPES;
  protected readonly typeLabels = PRODUCT_TYPE_LABELS;
  protected readonly formatClp = formatClp;

  protected readonly isNew = computed(() => !this.id());
  protected readonly loading = signal(false);
  protected readonly notFound = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly photoPreview = signal<string | null>(null);
  protected readonly stockTotal = signal(0);

  protected readonly originalPhoto = signal<Blob | null>(null);
  protected readonly cropping = signal(false);
  protected readonly loadingPhoto = signal(false);
  private photoFile: Blob | null = null;
  private currentPhotoUrl: string | null = null;
  private objectUrl: string | null = null;

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    type: ['collar' as ProductType, Validators.required],
    priceClp: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
    description: ['', Validators.maxLength(2000)],
    isActive: [true],
    variants: this.fb.array([this.variantGroup()]),
  });

  protected get variants(): FormArray {
    return this.form.controls.variants;
  }

  constructor() {
    this.form.controls.variants.valueChanges.subscribe((rows) =>
      this.stockTotal.set(rows.reduce((sum, r) => sum + (Number(r.stock) || 0), 0)),
    );
  }

  async ngOnInit() {
    const id = this.id();
    if (!id) return;
    this.loading.set(true);
    try {
      const p = await this.repo.getById(id);
      this.currentPhotoUrl = p.photoUrl;
      this.photoPreview.set(p.photoUrl);
      this.form.controls.variants.clear();
      for (const v of p.variants.length ? p.variants : [{ color: null, size: null, stock: 0 }]) {
        this.form.controls.variants.push(this.variantGroup(v.color ?? '', v.size ?? '', v.stock));
      }
      this.form.patchValue({
        name: p.name,
        type: p.type,
        priceClp: p.priceClp,
        description: p.description ?? '',
        isActive: p.isActive,
      });
    } catch {
      this.notFound.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  ngOnDestroy() {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
  }

  protected addVariant() {
    this.form.controls.variants.push(this.variantGroup());
  }

  protected removeVariant(index: number) {
    if (this.form.controls.variants.length > 1) this.form.controls.variants.removeAt(index);
  }

  onPhotoSelected(event: Event) {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    inputEl.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.error.set('El archivo debe ser una imagen.');
      return;
    }
    this.originalPhoto.set(file);
    this.cropping.set(true);
  }

  /** Opens the cropper on the last picked file, or on the saved photo when editing. */
  protected async adjustPhoto() {
    if (!this.originalPhoto() && this.currentPhotoUrl) {
      this.loadingPhoto.set(true);
      try {
        const res = await fetch(this.currentPhotoUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.originalPhoto.set(await res.blob());
      } catch {
        this.error.set('No pudimos cargar la foto actual. Prueba eligiéndola de nuevo con "Cambiar".');
        return;
      } finally {
        this.loadingPhoto.set(false);
      }
    }
    if (this.originalPhoto()) this.cropping.set(true);
  }

  protected onPhotoCropped(blob: Blob) {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = URL.createObjectURL(blob);
    this.photoFile = blob;
    this.photoPreview.set(this.objectUrl);
    this.cropping.set(false);
  }

  protected removePhoto() {
    this.photoFile = null;
    this.originalPhoto.set(null);
    this.currentPhotoUrl = null;
    this.photoPreview.set(null);
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
      const photoUrl = this.photoFile ? await this.repo.uploadPhoto(this.photoFile) : this.currentPhotoUrl;
      await this.repo.save(this.id() ?? null, {
        name: v.name.trim(),
        type: v.type,
        priceClp: Number(v.priceClp),
        description: v.description.trim() || null,
        isActive: v.isActive,
        photoUrl,
        variants: v.variants.map((r) => ({
          color: r.color.trim() || null,
          size: r.size.trim() || null,
          stock: Math.max(0, Math.floor(Number(r.stock) || 0)),
        })),
      });
      await this.router.navigateByUrl('/admin/products');
    } catch (e) {
      const err = e as { code?: string; message?: string };
      this.error.set(
        err.code === '23505'
          ? 'Hay variantes repetidas (mismo color y talla).'
          : /forbidden/.test(err.message ?? '')
            ? 'Tu usuario no tiene rol de administrador.'
            : 'No pudimos guardar el producto. Inténtalo de nuevo.',
      );
    } finally {
      this.saving.set(false);
    }
  }

  async remove() {
    const id = this.id();
    if (
      !id ||
      !(await this.confirmDialog.ask({
        title: '¿Eliminar este producto?',
        message: 'Esta acción no se puede deshacer.',
        confirmText: 'Eliminar',
        icon: 'trash',
        danger: true,
      }))
    )
      return;
    this.saving.set(true);
    try {
      await this.repo.remove(id);
      await this.router.navigateByUrl('/admin/products');
    } catch {
      this.error.set('No pudimos eliminar el producto.');
      this.saving.set(false);
    }
  }

  private variantGroup(color = '', size = '', stock = 0) {
    return this.fb.group({
      color: [color, Validators.maxLength(40)],
      size: [size, Validators.maxLength(20)],
      stock: [stock, [Validators.required, Validators.min(0)]],
    });
  }
}
