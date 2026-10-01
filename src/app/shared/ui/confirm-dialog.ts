import { ChangeDetectionStrategy, Component, inject, Injectable, signal } from '@angular/core';
import { Icon, IconName } from './icon';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  /** Red confirm button, for actions that delete or block. */
  danger?: boolean;
  icon?: IconName;
}

/** Styled replacement for window.confirm(): `if (!(await confirmDialog.ask({...}))) return;` */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly current = signal<ConfirmOptions | null>(null);
  private resolve: ((ok: boolean) => void) | null = null;

  ask(options: ConfirmOptions): Promise<boolean> {
    this.resolve?.(false);
    this.current.set(options);
    return new Promise((resolve) => (this.resolve = resolve));
  }

  answer(ok: boolean) {
    this.resolve?.(ok);
    this.resolve = null;
    this.current.set(null);
  }
}

/** Rendered once in the app root; shows whatever ConfirmService is asking. */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  host: { '(document:keydown.escape)': 'service.current() && service.answer(false)' },
  template: `
    @if (service.current(); as c) {
      <div class="fixed inset-0 z-[60] flex items-center justify-center p-6">
        <div class="absolute inset-0 bg-slate-900/40" (click)="service.answer(false)"></div>
        <div class="relative w-full max-w-xs rounded-2xl bg-white p-5 text-center shadow-xl sm:max-w-sm sm:rounded-3xl sm:p-6" role="alertdialog" aria-modal="true"
          aria-labelledby="confirm-title" [attr.aria-describedby]="c.message ? 'confirm-message' : null">
          <span class="mx-auto grid size-10 place-items-center rounded-full" [class]="c.danger ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-700'">
            <app-icon [name]="c.icon ?? (c.danger ? 'alert' : 'help')" class="size-5" />
          </span>
          <h2 id="confirm-title" class="mt-3 text-base font-bold sm:text-lg">{{ c.title }}</h2>
          @if (c.message) {
            <p id="confirm-message" class="mt-1 text-sm text-muted">{{ c.message }}</p>
          }
          <div class="mt-5 grid grid-cols-2 gap-2">
            <button type="button" class="btn btn-secondary btn-sm py-2.5" (click)="service.answer(false)">{{ c.cancelText ?? 'Cancelar' }}</button>
            <button type="button" class="btn btn-sm py-2.5" [class]="c.danger ? 'btn-danger' : 'btn-primary'" (click)="service.answer(true)" autofocus>
              {{ c.confirmText ?? 'Aceptar' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialog {
  protected readonly service = inject(ConfirmService);
}
