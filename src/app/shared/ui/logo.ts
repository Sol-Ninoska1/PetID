import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from './icon';

@Component({
  selector: 'app-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon],
  template: `
    <a routerLink="/" class="inline-flex items-center gap-2 font-extrabold tracking-tight text-ink">
      <span class="grid size-9 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
        <app-icon name="paw" class="size-5" />
      </span>
      <span class="text-lg">Pet<span class="text-brand-600">ID</span></span>
    </a>
  `,
})
export class Logo {}
