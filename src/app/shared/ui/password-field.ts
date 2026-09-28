import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';
import { Icon } from './icon';

/** Wraps a projected `<input type="password">` and adds a show/hide button. The input needs right padding (`pr-11`). */
@Component({
  selector: 'app-password-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  host: { class: 'relative block' },
  template: `
    <ng-content />
    <button type="button" class="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-2xl text-slate-500 hover:text-ink focus-visible:text-ink"
      [attr.aria-label]="visible() ? 'Ocultar contraseña' : 'Mostrar contraseña'" [attr.aria-pressed]="visible()" (click)="toggle()">
      <app-icon [name]="visible() ? 'eye-off' : 'eye'" class="size-5" />
    </button>
  `,
})
export class PasswordField {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly visible = signal(false);

  protected toggle() {
    const input = this.host.nativeElement.querySelector('input');
    if (!input) return;
    this.visible.update((v) => !v);
    input.type = this.visible() ? 'text' : 'password';
  }
}
