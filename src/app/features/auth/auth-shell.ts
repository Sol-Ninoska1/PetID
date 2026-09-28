import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Logo } from '../../shared/ui/logo';

@Component({
  selector: 'app-auth-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Logo],
  template: `
    <div class="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <app-logo class="mb-8" />
      <div class="card w-full max-w-md p-6 sm:p-8">
        <h1 class="text-2xl font-bold tracking-tight">{{ heading() }}</h1>
        @if (subheading()) {
          <p class="mt-1 text-muted">{{ subheading() }}</p>
        }
        <div class="mt-6">
          <ng-content />
        </div>
      </div>
      <ng-content select="[footer]" />
    </div>
  `,
})
export class AuthShell {
  readonly heading = input.required<string>();
  readonly subheading = input<string>();
}
