import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PET_ID_STATUS_LABELS, PetIdStatus } from '../../core/models';

const STYLES: Record<PetIdStatus, string> = {
  available: 'bg-sky-50 text-sky-700 ring-sky-200',
  reserved: 'bg-violet-50 text-violet-700 ring-violet-200',
  sold: 'bg-amber-50 text-amber-800 ring-amber-200',
  activated: 'bg-brand-50 text-brand-800 ring-brand-200',
  blocked: 'bg-slate-100 text-slate-600 ring-slate-200',
};

@Component({
  selector: 'app-pet-id-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ring-1" [class]="css()">
      <span class="size-1.5 rounded-full bg-current"></span>
      {{ label() }}
    </span>
  `,
})
export class PetIdStatusBadge {
  readonly status = input.required<PetIdStatus>();

  protected readonly label = computed(() => PET_ID_STATUS_LABELS[this.status()]);
  protected readonly css = computed(() => STYLES[this.status()]);
}
