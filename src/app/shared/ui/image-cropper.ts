import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  OnDestroy,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Icon } from './icon';

const MAX_ZOOM = 4;

/**
 * Modal to frame a photo before uploading (drag to move, slider / wheel / pinch to zoom).
 * Emits the visible area as a JPEG blob of `outputWidth` px.
 */
@Component({
  selector: 'app-image-cropper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  host: { '(document:keydown.escape)': 'cancelled.emit()' },
  template: `
    <div class="fixed inset-0 z-50 flex items-end justify-center bg-ink/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog" aria-modal="true" aria-labelledby="cropper-title">
      <div class="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 id="cropper-title" class="text-lg font-bold">{{ heading() }}</h2>
            <p class="text-sm text-muted">Arrastra la foto y usa el zoom para centrar {{ hint() }}.</p>
          </div>
          <button type="button" class="btn btn-ghost btn-sm -mr-2" aria-label="Cerrar" (click)="cancelled.emit()">
            <app-icon name="x" class="size-5" />
          </button>
        </div>

        <div #viewport class="relative mt-4 w-full cursor-grab touch-none select-none overflow-hidden rounded-2xl bg-slate-900 active:cursor-grabbing"
          [style.aspect-ratio]="aspect()"
          (pointerdown)="onPointerDown($event)" (pointermove)="onPointerMove($event)"
          (pointerup)="onPointerUp($event)" (pointercancel)="onPointerUp($event)" (wheel)="onWheel($event)">
          @if (src(); as src) {
            <img [src]="src" alt="" draggable="false" class="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
              [style.width.px]="displayWidth()" [style.height.px]="displayHeight()"
              [style.transform]="'translate(-50%, -50%) translate(' + offsetX() + 'px, ' + offsetY() + 'px)'"
              (load)="onImageLoad($event)" />
          }
          <div class="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-60">
            @for (cell of cells; track cell) {
              <span class="border border-white/25"></span>
            }
          </div>
          <div class="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-inset ring-white/80"></div>
        </div>

        <div class="mt-4 flex items-center gap-3">
          <button type="button" class="btn btn-ghost btn-sm size-9 p-0 text-lg" aria-label="Alejar" (click)="setZoom(zoom() - 0.2)">−</button>
          <input type="range" class="flex-1 accent-brand-600" min="1" [max]="maxZoom" step="0.01" aria-label="Zoom"
            [value]="zoom()" (input)="setZoom(+$any($event.target).value)" />
          <button type="button" class="btn btn-ghost btn-sm size-9 p-0 text-lg" aria-label="Acercar" (click)="setZoom(zoom() + 0.2)">+</button>
        </div>

        <div class="mt-5 grid grid-cols-2 gap-3">
          <button type="button" class="btn btn-secondary" (click)="cancelled.emit()">Cancelar</button>
          <button type="button" class="btn btn-primary" [disabled]="!ready() || busy()" (click)="confirm()">
            {{ busy() ? 'Procesando…' : 'Usar foto' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ImageCropper implements OnDestroy {
  readonly file = input.required<Blob>();
  /** Width / height of the result. */
  readonly aspect = input(1);
  readonly outputWidth = input(1080);
  readonly heading = input('Ajusta la foto');
  readonly hint = input('su cara');

  readonly cropped = output<Blob>();
  readonly cancelled = output<void>();

  private readonly viewport = viewChild.required<ElementRef<HTMLDivElement>>('viewport');

  protected readonly cells = Array.from({ length: 9 }, (_, i) => i);
  protected readonly maxZoom = MAX_ZOOM;

  protected readonly src = signal<string | null>(null);
  protected readonly ready = signal(false);
  protected readonly busy = signal(false);
  protected readonly zoom = signal(1);
  protected readonly offsetX = signal(0);
  protected readonly offsetY = signal(0);

  private readonly natural = signal({ width: 1, height: 1 });
  private readonly frame = signal({ width: 1, height: 1 });
  private image: HTMLImageElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private pinchStart: { distance: number; zoom: number } | null = null;

  /** Scale at zoom 1: the image just covers the frame. */
  private readonly baseScale = computed(() =>
    Math.max(this.frame().width / this.natural().width, this.frame().height / this.natural().height),
  );
  protected readonly displayWidth = computed(() => this.natural().width * this.baseScale() * this.zoom());
  protected readonly displayHeight = computed(() => this.natural().height * this.baseScale() * this.zoom());

  constructor() {
    effect((onCleanup) => {
      const url = URL.createObjectURL(this.file());
      this.ready.set(false);
      this.src.set(url);
      onCleanup(() => URL.revokeObjectURL(url));
    });
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
  }

  protected onImageLoad(event: Event) {
    this.image = event.target as HTMLImageElement;
    this.natural.set({ width: this.image.naturalWidth, height: this.image.naturalHeight });
    const el = this.viewport().nativeElement;
    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver(() => {
      this.frame.set({ width: el.clientWidth, height: el.clientHeight });
      this.clampOffset();
    });
    this.resizeObserver.observe(el);
    this.zoom.set(1);
    this.offsetX.set(0);
    this.offsetY.set(0);
    this.ready.set(true);
  }

  protected setZoom(value: number) {
    this.zoom.set(Math.min(MAX_ZOOM, Math.max(1, value)));
    this.clampOffset();
  }

  protected onWheel(event: WheelEvent) {
    event.preventDefault();
    this.setZoom(this.zoom() * (event.deltaY < 0 ? 1.08 : 1 / 1.08));
  }

  protected onPointerDown(event: PointerEvent) {
    this.viewport().nativeElement.setPointerCapture(event.pointerId);
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.pointers.size === 2) this.pinchStart = { distance: this.pinchDistance(), zoom: this.zoom() };
  }

  protected onPointerMove(event: PointerEvent) {
    const previous = this.pointers.get(event.pointerId);
    if (!previous) return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.pointers.size >= 2 && this.pinchStart) {
      this.setZoom(this.pinchStart.zoom * (this.pinchDistance() / this.pinchStart.distance));
      return;
    }
    this.offsetX.update((x) => x + event.clientX - previous.x);
    this.offsetY.update((y) => y + event.clientY - previous.y);
    this.clampOffset();
  }

  protected onPointerUp(event: PointerEvent) {
    this.pointers.delete(event.pointerId);
    if (this.pointers.size < 2) this.pinchStart = null;
  }

  protected async confirm() {
    if (!this.image) return;
    this.busy.set(true);
    try {
      const outW = this.outputWidth();
      const outH = Math.round(outW / this.aspect());
      const scale = this.displayWidth() / this.natural().width;
      const { width: fw, height: fh } = this.frame();
      const sx = (this.displayWidth() / 2 - this.offsetX() - fw / 2) / scale;
      const sy = (this.displayHeight() / 2 - this.offsetY() - fh / 2) / scale;

      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this.image, sx, sy, fw / scale, fh / scale, 0, 0, outW, outH);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
      if (blob) this.cropped.emit(blob);
    } finally {
      this.busy.set(false);
    }
  }

  /** Keeps the frame fully covered by the image. */
  private clampOffset() {
    const maxX = Math.max(0, (this.displayWidth() - this.frame().width) / 2);
    const maxY = Math.max(0, (this.displayHeight() - this.frame().height) / 2);
    this.offsetX.update((x) => Math.min(maxX, Math.max(-maxX, x)));
    this.offsetY.update((y) => Math.min(maxY, Math.max(-maxY, y)));
  }

  private pinchDistance() {
    const [a, b] = [...this.pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
}
