import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, OnInit, output, signal, viewChild } from '@angular/core';
import { extractQrToken } from '../utils/qr-label';
import { Icon } from './icon';

type ScanState = 'starting' | 'scanning' | 'denied' | 'unavailable';

/** Full-screen camera that reads a PetID QR and emits its token. Plates print the QR light on dark, so both polarities are tried. */
@Component({
  selector: 'app-qr-scanner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  host: { class: 'fixed inset-0 z-50 flex flex-col bg-black text-white', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Escanear QR' },
  template: `
    <video #video class="absolute inset-0 size-full object-cover" autoplay muted playsinline></video>

    <div class="relative flex items-center justify-between p-4 pt-[calc(1rem+env(safe-area-inset-top))]">
      <p class="font-semibold">Escanear PetID</p>
      <button type="button" class="grid size-10 place-items-center rounded-full bg-black/50 backdrop-blur" aria-label="Cerrar" (click)="closed.emit()">
        <app-icon name="x" class="size-5" />
      </button>
    </div>

    <div class="relative flex flex-1 flex-col items-center justify-center px-6 text-center">
      @switch (state()) {
        @case ('denied') {
          <app-icon name="camera" class="size-10 text-white/70" />
          <p class="mt-3 font-semibold">No tenemos permiso para usar la cámara</p>
          <p class="mt-1 text-sm text-white/70">Actívalo en la configuración del navegador, o pega el enlace de tu PetID.</p>
        }
        @case ('unavailable') {
          <app-icon name="camera" class="size-10 text-white/70" />
          <p class="mt-3 font-semibold">No encontramos una cámara</p>
          <p class="mt-1 text-sm text-white/70">Puedes pegar el enlace de tu PetID en su lugar.</p>
        }
        @default {
          <div class="relative size-64 max-w-[75vw] max-h-[75vw] rounded-3xl shadow-[0_0_0_100vmax_rgba(0,0,0,0.45)]">
            <span class="absolute -left-0.5 -top-0.5 size-10 rounded-tl-3xl border-l-4 border-t-4 border-white"></span>
            <span class="absolute -right-0.5 -top-0.5 size-10 rounded-tr-3xl border-r-4 border-t-4 border-white"></span>
            <span class="absolute -bottom-0.5 -left-0.5 size-10 rounded-bl-3xl border-b-4 border-l-4 border-white"></span>
            <span class="absolute -bottom-0.5 -right-0.5 size-10 rounded-br-3xl border-b-4 border-r-4 border-white"></span>
          </div>
          <p class="relative mt-6 font-semibold">
            {{ state() === 'starting' ? 'Abriendo la cámara…' : 'Apunta al QR de la placa de tu collar' }}
          </p>
          <p class="relative mt-1 h-5 text-sm text-amber-300" aria-live="polite">{{ hint() }}</p>
        }
      }
    </div>

    <div class="relative p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-center">
      <button type="button" class="btn btn-sm bg-white/15 text-white backdrop-blur hover:bg-white/25" (click)="paste.emit()">
        <app-icon name="link" class="size-4" /> Pegar el enlace
      </button>
    </div>
  `,
})
export class QrScanner implements OnInit {
  readonly scanned = output<string>();
  readonly closed = output<void>();
  readonly paste = output<void>();

  protected readonly state = signal<ScanState>('starting');
  protected readonly hint = signal('');

  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  private stream: MediaStream | null = null;
  private frame = 0;
  private stopped = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  async ngOnInit() {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.state.set('unavailable');
      return;
    }
    try {
      const [stream, { default: jsQR }] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false }),
        import('jsqr'),
      ]);
      if (this.stopped) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      this.stream = stream;
      const video = this.video().nativeElement;
      video.srcObject = stream;
      await video.play();
      this.state.set('scanning');
      this.loop(video, jsQR);
    } catch (e) {
      const name = (e as DOMException)?.name;
      this.state.set(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable');
    }
  }

  private loop(video: HTMLVideoElement, jsQR: typeof import('jsqr').default) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    let last = 0;
    let hintTimer = 0;

    const tick = (now: number) => {
      if (this.stopped) return;
      this.frame = requestAnimationFrame(tick);
      if (now - last < 120 || !video.videoWidth) return;
      last = now;

      // Only the centre square (where the frame guide is) is decoded, at a size phones handle every frame.
      const side = Math.min(video.videoWidth, video.videoHeight) * 0.8;
      const size = Math.min(480, Math.round(side));
      canvas.width = canvas.height = size;
      ctx.drawImage(video, (video.videoWidth - side) / 2, (video.videoHeight - side) / 2, side, side, 0, 0, size, size);
      const result = jsQR(ctx.getImageData(0, 0, size, size).data, size, size, { inversionAttempts: 'attemptBoth' });
      if (!result?.data) return;

      const token = /\/(?:p|activate)\//.test(result.data) ? extractQrToken(result.data) : null;
      if (token) {
        navigator.vibrate?.(60);
        this.stop();
        this.scanned.emit(token);
      } else {
        this.hint.set('Ese QR no es de una placa PetID');
        clearTimeout(hintTimer);
        hintTimer = window.setTimeout(() => this.hint.set(''), 2500);
      }
    };
    this.frame = requestAnimationFrame(tick);
  }

  private stop() {
    this.stopped = true;
    cancelAnimationFrame(this.frame);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}
