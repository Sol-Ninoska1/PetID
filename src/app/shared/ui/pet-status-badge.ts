import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-pet-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" [class]="status().css">
      <span class="size-1.5 rounded-full bg-current"></span>
      {{ status().label }}
    </span>
  `,
})
export class PetStatusBadge {
  readonly isLost = input.required<boolean>();
  readonly isActive = input(true);

  protected readonly status = computed(() => {
    if (!this.isActive()) return { label: 'Placa inactiva', css: 'bg-slate-100 text-slate-600' };
    if (this.isLost()) return { label: 'Perdida', css: 'bg-red-100 text-red-700' };
    return { label: 'Protegida', css: 'bg-brand-100 text-brand-800' };
  });
}
