import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon, IconName } from '../../shared/ui/icon';

/** Placeholder for admin sections planned after the MVP (products, settings). Title/text come from route data. */
@Component({
  selector: 'app-admin-coming-soon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <h1 class="page-title">{{ heading() }}</h1>
    <div class="card mt-6 flex flex-col items-center px-6 py-14 text-center">
      <span class="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">
        <app-icon [name]="icon()" class="size-7" />
      </span>
      <p class="mt-4 font-bold">Próximamente</p>
      <p class="mt-1 max-w-md text-sm text-muted">{{ description() }}</p>
    </div>
  `,
})
export class AdminComingSoon {
  readonly heading = input('');
  readonly description = input('');
  readonly icon = input<IconName>('sparkles');
}
