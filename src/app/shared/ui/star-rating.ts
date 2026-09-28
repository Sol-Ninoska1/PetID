import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';

const STAR = 'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z';

/**
 * App Store–style stars. Read-only by default (supports fractions like 4.6);
 * with `editable` it becomes a 1–5 picker bound through `[(value)]`.
 */
@Component({
  selector: 'app-star-rating',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    @if (editable()) {
      <div class="flex gap-1" role="radiogroup" [attr.aria-label]="label()" (mouseleave)="hover.set(0)">
        @for (s of stars; track s) {
          <button type="button" role="radio" class="rounded-md transition hover:scale-110 focus-visible:outline-2 focus-visible:outline-brand-500"
            [attr.aria-checked]="value() === s" [attr.aria-label]="s === 1 ? '1 estrella' : s + ' estrellas'"
            (click)="value.set(s)" (mouseenter)="hover.set(s)">
            <svg viewBox="0 0 24 24" fill="currentColor" [class]="starClass()"
              [class.text-amber-400]="shown() >= s" [class.text-slate-200]="shown() < s" aria-hidden="true"><path [attr.d]="path" /></svg>
          </button>
        }
      </div>
    } @else {
      <span class="relative inline-flex" role="img" [attr.aria-label]="value() + ' de 5 estrellas'">
        <span class="flex text-slate-200">
          @for (s of stars; track s) {
            <svg viewBox="0 0 24 24" fill="currentColor" class="shrink-0" [class]="starClass()" aria-hidden="true"><path [attr.d]="path" /></svg>
          }
        </span>
        <span class="absolute inset-y-0 left-0 flex overflow-hidden text-amber-400" [style.width.%]="(value() / 5) * 100">
          @for (s of stars; track s) {
            <svg viewBox="0 0 24 24" fill="currentColor" class="shrink-0" [class]="starClass()" aria-hidden="true"><path [attr.d]="path" /></svg>
          }
        </span>
      </span>
    }
  `,
})
export class StarRating {
  readonly value = model(0);
  readonly editable = input(false);
  /** Tailwind size classes for each star, e.g. `size-4`. */
  readonly starClass = input('size-5');
  readonly label = input('Calificación');

  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly path = STAR;
  protected readonly hover = signal(0);
  protected readonly shown = computed(() => this.hover() || this.value());
}
