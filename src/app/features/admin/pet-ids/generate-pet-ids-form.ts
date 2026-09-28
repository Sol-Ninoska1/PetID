import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminRepository } from '../../../core/data/admin.repository';
import { Icon } from '../../../shared/ui/icon';

/** Generates generic PetIDs: no pet or owner data, just code + secure QR token. */
@Component({
  selector: 'app-generate-pet-ids-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Icon],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="card p-5" novalidate>
      <div class="flex items-start gap-3">
        <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
          <app-icon name="sparkles" class="size-5" />
        </span>
        <div>
          <h2 class="font-bold">Generar PetIDs</h2>
          <p class="text-sm text-muted">Cada una recibe un código interno (PET-00001) y un QR único. Quedan como <strong>Disponible</strong>.</p>
        </div>
      </div>

      <div class="mt-4 grid gap-3 sm:grid-cols-[140px_1fr_auto] sm:items-end">
        <div>
          <label class="field-label" for="count">Cantidad</label>
          <select id="count" class="field-input" formControlName="count">
            @for (n of counts; track n) {
              <option [ngValue]="n">{{ n }}</option>
            }
          </select>
        </div>
        <div>
          <label class="field-label" for="notes">Nota interna <span class="font-normal text-muted">(opcional)</span></label>
          <input id="notes" class="field-input" formControlName="notes" placeholder="Ej: Lote collares azules" maxlength="500" />
        </div>
        <button type="submit" class="btn btn-primary" [disabled]="saving()">
          <app-icon name="plus" class="size-5" />
          {{ saving() ? 'Generando…' : form.controls.count.value === 1 ? 'Generar nueva PetID' : 'Generar ' + form.controls.count.value + ' PetIDs' }}
        </button>
      </div>
      @if (error()) {
        <p class="alert-error mt-3">{{ error() }}</p>
      }
    </form>
  `,
})
export class GeneratePetIdsForm {
  private readonly repo = inject(AdminRepository);

  readonly created = output<string[]>();

  protected readonly counts = [1, 5, 10, 25, 50, 100];
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    count: [1, [Validators.required, Validators.min(1), Validators.max(200)]],
    notes: ['', Validators.maxLength(500)],
  });

  async submit() {
    this.saving.set(true);
    this.error.set(null);
    try {
      const { count, notes } = this.form.getRawValue();
      const ids = await this.repo.createPetIds(count, notes.trim() || null);
      this.form.reset({ count: 1, notes: '' });
      this.created.emit(ids);
    } catch (e) {
      this.error.set(
        /forbidden/.test((e as { message?: string })?.message ?? '')
          ? 'Tu usuario no tiene rol de administrador.'
          : 'No pudimos generar las PetIDs. Inténtalo de nuevo.',
      );
    } finally {
      this.saving.set(false);
    }
  }
}
