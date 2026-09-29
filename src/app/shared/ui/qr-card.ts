import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import {
  downloadBlob,
  isTemporaryBaseUrl,
  LABEL_FORMATS,
  LabelFormat,
  labelPdf,
  labelPng,
  labelSvg,
  printLabels,
  publicPetIdUrl,
  saveLabelFormat,
  savedLabelFormat,
  svgDataUrl,
} from '../utils/qr-label';
import { Icon } from './icon';

/** Printable PetID label (30 mm round plate or rectangular tag) with copy, PNG/SVG/PDF downloads and print. */
@Component({
  selector: 'app-qr-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="card p-5 sm:p-6">
      @if (admin()) {
        <div class="mb-4 grid grid-cols-2 gap-1 rounded-2xl bg-surface p-1 ring-1 ring-slate-200" role="radiogroup" aria-label="Formato del QR">
          @for (f of formats; track f.value) {
            <button type="button" role="radio" class="btn btn-sm" [attr.aria-checked]="format() === f.value"
              [class]="format() === f.value ? 'bg-white shadow-sm ring-1 ring-slate-200' : 'btn-ghost text-muted'" (click)="setFormat(f.value)">
              {{ f.label }}
            </button>
          }
        </div>
      }

      <div class="mx-auto w-full rounded-2xl bg-white p-2 ring-1 ring-slate-200" [class]="format() === 'round' ? 'max-w-56' : 'max-w-64'">
        <img [src]="preview()" [alt]="'QR de ' + code()" class="block w-full" />
      </div>
      @if (admin() && format() === 'round') {
        <p class="mt-3 text-center text-xs text-muted">
          Tamaño real: 30 mm de diámetro. El círculo gris es solo el borde de referencia y arriba queda libre para el agujero de la argolla.
        </p>
      }

      @if (admin() && temporaryUrl) {
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
  /** Admin screens pick the label format and warn when QRs would encode a dev origin; owners always get the round plate. */
  readonly admin = input(false);

  protected readonly temporaryUrl = isTemporaryBaseUrl();
  protected readonly baseOrigin = location.origin;
  protected readonly copied = signal(false);
  protected readonly busy = signal(false);
  protected readonly popupBlocked = signal(false);

  protected readonly formats = LABEL_FORMATS;
  private readonly selectedFormat = signal<LabelFormat>(savedLabelFormat());
  protected readonly format = computed<LabelFormat>(() => (this.admin() ? this.selectedFormat() : 'round'));

  protected readonly url = computed(() => publicPetIdUrl(this.qrToken()));
  private readonly label = computed(() => ({ code: this.code(), url: this.url() }));
  protected readonly preview = computed(() => svgDataUrl(labelSvg(this.label(), this.format())));
  private readonly filename = computed(
    () => `petid-${this.code().toLowerCase()}${this.format() === 'round' ? '-placa-30mm' : ''}`,
  );

  protected setFormat(format: LabelFormat) {
    this.selectedFormat.set(format);
    saveLabelFormat(format);
  }

  async copy() {
    await navigator.clipboard.writeText(this.url());
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }

  async downloadPng() {
    this.busy.set(true);
    try {
      downloadBlob(await labelPng(this.label(), this.format()), `${this.filename()}.png`);
    } finally {
      this.busy.set(false);
    }
  }

  downloadSvg() {
    downloadBlob(new Blob([labelSvg(this.label(), this.format())], { type: 'image/svg+xml' }), `${this.filename()}.svg`);
  }

  downloadPdf() {
    downloadBlob(labelPdf(this.label(), this.format()), `${this.filename()}.pdf`);
  }

  print() {
    this.popupBlocked.set(!printLabels([this.label()], this.format()));
  }
}
