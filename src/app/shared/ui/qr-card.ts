import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, signal } from '@angular/core';
import {
  downloadBlob,
  isTemporaryBaseUrl,
  LABEL_FORMATS,
  LabelFormat,
  labelPdf,
  labelPng,
  LabelSide,
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

      <div class="mx-auto w-full" [class]="format() === 'round' ? 'max-w-56' : 'max-w-64 rounded-2xl bg-white p-2 ring-1 ring-slate-200'">
        <img [src]="preview()" [alt]="'QR de ' + code()" class="block w-full" />
      </div>

      @if (admin() && format() === 'round') {
        <label class="mt-4 block">
          <span class="field-label">Nombre en la placa</span>
          <input class="field-input" maxlength="14" placeholder="Ej: Hachi (opcional)" [value]="name()"
            (input)="name.set($any($event.target).value)" />
        </label>
        <p class="mt-1 text-xs text-muted">Tamaño real: 30 mm de diámetro. El borde del círculo es la línea de corte.</p>
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

      @if (admin() && format() === 'round') {
        <div class="mt-4 flex items-center gap-4 rounded-2xl bg-surface p-3 ring-1 ring-slate-200">
          <img [src]="backPreview" alt="Parte de atrás de la placa" class="size-20 shrink-0" />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold">Parte de atrás</p>
            <p class="text-xs text-muted">Es igual para todas las placas.</p>
            <div class="mt-2 flex flex-wrap gap-2">
              <button type="button" class="btn btn-secondary btn-sm" [disabled]="busy()" (click)="downloadPng('back')">PNG</button>
              <button type="button" class="btn btn-secondary btn-sm" (click)="downloadSvg('back')">SVG</button>
              <button type="button" class="btn btn-secondary btn-sm" (click)="downloadPdf('back')">PDF</button>
              <button type="button" class="btn btn-ghost btn-sm" (click)="print('back')">
                <app-icon name="printer" class="size-4" /> Imprimir
              </button>
            </div>
          </div>
        </div>
      }

      @if (popupBlocked()) {
        <p class="field-error text-center">Permite las ventanas emergentes para imprimir.</p>
      }
    </div>
  `,
})
export class QrCard {
  readonly code = input.required<string>();
  readonly qrToken = input.required<string>();
  /** Shown above the QR on the round plate; admins can type a different one before manufacturing. */
  readonly petName = input<string | null>(null);
  /** Admin screens pick the label format, edit the name, get the plate back and warn when QRs would encode a dev origin. */
  readonly admin = input(false);

  protected readonly temporaryUrl = isTemporaryBaseUrl();
  protected readonly baseOrigin = location.origin;
  protected readonly copied = signal(false);
  protected readonly busy = signal(false);
  protected readonly popupBlocked = signal(false);

  protected readonly formats = LABEL_FORMATS;
  private readonly selectedFormat = signal<LabelFormat>(savedLabelFormat());
  protected readonly format = computed<LabelFormat>(() => (this.admin() ? this.selectedFormat() : 'round'));
  protected readonly name = linkedSignal(() => this.petName() ?? '');

  protected readonly url = computed(() => publicPetIdUrl(this.qrToken()));
  private readonly label = computed(() => ({
    code: this.code(),
    url: this.url(),
    name: this.admin() ? this.name() : this.petName(),
  }));
  protected readonly preview = computed(() => svgDataUrl(labelSvg(this.label(), this.format())));
  protected readonly backPreview = svgDataUrl(labelSvg({ code: '', url: '' }, 'round', 'back'));

  private filename(side: LabelSide) {
    if (this.format() === 'tag') return `petid-${this.code().toLowerCase()}`;
    return side === 'back' ? 'petid-placa-30mm-atras' : `petid-${this.code().toLowerCase()}-placa-30mm`;
  }

  protected setFormat(format: LabelFormat) {
    this.selectedFormat.set(format);
    saveLabelFormat(format);
  }

  async copy() {
    await navigator.clipboard.writeText(this.url());
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }

  async downloadPng(side: LabelSide = 'front') {
    this.busy.set(true);
    try {
      downloadBlob(await labelPng(this.label(), this.format(), side), `${this.filename(side)}.png`);
    } finally {
      this.busy.set(false);
    }
  }

  downloadSvg(side: LabelSide = 'front') {
    const svg = labelSvg(this.label(), this.format(), side);
    downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), `${this.filename(side)}.svg`);
  }

  downloadPdf(side: LabelSide = 'front') {
    downloadBlob(labelPdf(this.label(), this.format(), side), `${this.filename(side)}.pdf`);
  }

  print(side: LabelSide = 'front') {
    this.popupBlocked.set(!printLabels([this.label()], this.format(), side));
  }
}
