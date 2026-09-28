import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import {
  downloadBlob,
  isTemporaryBaseUrl,
  labelPdf,
  labelPng,
  labelSvg,
  printLabels,
  publicPetIdUrl,
  svgDataUrl,
} from '../utils/qr-label';
import { Icon } from './icon';

/** Printable PetID label (brand + QR + code) with copy, PNG/SVG/PDF downloads and print. */
@Component({
  selector: 'app-qr-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="card p-5 sm:p-6">
      <div class="mx-auto w-full max-w-64 rounded-2xl bg-white p-2 ring-1 ring-slate-200">
        <img [src]="preview()" [alt]="'QR de ' + code()" class="block w-full" />
      </div>

      @if (warnTemporaryUrl() && temporaryUrl) {
        <p class="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs text-amber-900 ring-1 ring-amber-200">
          <strong>Ojo:</strong> este QR apunta a <code>{{ baseOrigin }}</code>. Antes de fabricar collares, define
          <code>publicBaseUrl</code> con tu dominio definitivo en <code>src/environments/environment.ts</code>.
        </p>
      }

      <div class="mt-4 flex items-center gap-2 rounded-2xl bg-surface p-2 pl-4 ring-1 ring-slate-200">
        <span class="min-w-0 flex-1 truncate text-left text-sm text-muted">{{ url() }}</span>
        <button type="button" class="btn btn-secondary btn-sm" (click)="copy()">
          <app-icon [name]="copied() ? 'check' : 'copy'" class="size-4" /> {{ copied() ? 'Copiada' : 'Copiar URL' }}
        </button>
      </div>

      <div class="mt-3 grid grid-cols-3 gap-2">
        <button type="button" class="btn btn-secondary btn-sm" [disabled]="busy()" (click)="downloadPng()">
          <app-icon name="download" class="size-4" /> PNG
        </button>
        <button type="button" class="btn btn-secondary btn-sm" (click)="downloadSvg()">
          <app-icon name="download" class="size-4" /> SVG
        </button>
        <button type="button" class="btn btn-secondary btn-sm" (click)="downloadPdf()">
          <app-icon name="download" class="size-4" /> PDF
        </button>
      </div>
      <button type="button" class="btn btn-primary mt-2 w-full" (click)="print()">
        <app-icon name="printer" class="size-5" /> Imprimir QR
      </button>
      @if (popupBlocked()) {
        <p class="field-error text-center">Permite las ventanas emergentes para imprimir.</p>
      }
    </div>
  `,
})
export class QrCard {
  readonly code = input.required<string>();
  readonly qrToken = input.required<string>();
  /** Admin screens warn when QRs would encode a dev origin. */
  readonly warnTemporaryUrl = input(false);

  protected readonly temporaryUrl = isTemporaryBaseUrl();
  protected readonly baseOrigin = location.origin;
  protected readonly copied = signal(false);
  protected readonly busy = signal(false);
  protected readonly popupBlocked = signal(false);

  protected readonly url = computed(() => publicPetIdUrl(this.qrToken()));
  private readonly label = computed(() => ({ code: this.code(), url: this.url() }));
  protected readonly preview = computed(() => svgDataUrl(labelSvg(this.label())));
  private readonly filename = computed(() => `petid-${this.code().toLowerCase()}`);

  async copy() {
    await navigator.clipboard.writeText(this.url());
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }

  async downloadPng() {
    this.busy.set(true);
    try {
      downloadBlob(await labelPng(this.label()), `${this.filename()}.png`);
    } finally {
      this.busy.set(false);
    }
  }

  downloadSvg() {
    downloadBlob(new Blob([labelSvg(this.label())], { type: 'image/svg+xml' }), `${this.filename()}.svg`);
  }

  downloadPdf() {
    downloadBlob(labelPdf(this.label()), `${this.filename()}.pdf`);
  }

  print() {
    this.popupBlocked.set(!printLabels([this.label()]));
  }
}
