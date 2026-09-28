import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Card + scroll container for admin listings. Pages project their own <thead>/<tbody>;
 * this component owns loading, empty and error states.
 */
@Component({
  selector: 'app-admin-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="card overflow-hidden">
      <ng-content select="[toolbar]" />
      @if (error()) {
        <p class="alert-error m-4">{{ error() }}</p>
      } @else if (loading()) {
        <div class="space-y-2 p-4">
          @for (i of [1, 2, 3, 4]; track i) {
            <div class="h-10 animate-pulse rounded-xl bg-slate-100"></div>
          }
        </div>
      } @else if (empty()) {
        <p class="px-6 py-14 text-center text-sm text-muted">{{ emptyText() }}</p>
      } @else {
        <div class="overflow-x-auto">
          <table class="admin-table">
            <ng-content />
          </table>
        </div>
      }
    </div>
  `,
})
export class AdminTable {
  readonly loading = input(false);
  readonly empty = input(false);
  readonly error = input<string | null>(null);
  readonly emptyText = input('No hay registros.');
}
