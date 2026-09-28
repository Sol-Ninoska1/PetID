import { ChangeDetectionStrategy, Component, effect, input, signal } from '@angular/core';
import QRCode from 'qrcode';

@Component({
  selector: 'app-qr-code',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (dataUrl(); as src) {
      <img [src]="src" [alt]="alt()" class="size-full" style="image-rendering: pixelated" />
    } @else {
      <div class="size-full animate-pulse rounded-xl bg-slate-100"></div>
    }
  `,
})
export class QrCode {
  readonly value = input.required<string>();
  readonly alt = input('Código QR');
  readonly dataUrl = signal<string | null>(null);

  constructor() {
    effect(() => {
      QRCode.toDataURL(this.value(), { width: 720, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#1c2733' } })
        .then((url) => this.dataUrl.set(url));
    });
  }
}
