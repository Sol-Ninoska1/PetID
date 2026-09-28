import { signal } from '@angular/core';

/**
 * State of a photo field that goes through the cropper: the saved URL, the source image
 * kept for re-framing, and the cropped blob waiting to be uploaded on save.
 */
export class EditablePhoto {
  readonly preview = signal<string | null>(null);
  /** Image the cropper works on: the last picked file, or the saved photo once downloaded. */
  readonly source = signal<Blob | null>(null);
  readonly loading = signal(false);
  /** Cropped image pending upload. */
  pending: Blob | null = null;
  savedUrl: string | null = null;
  private objectUrl: string | null = null;

  setSaved(url: string | null) {
    this.savedUrl = url;
    this.preview.set(url);
  }

  pick(file: Blob) {
    this.source.set(file);
  }

  /** Makes sure there is a source image for the cropper (downloads the saved one if needed). */
  async ensureSource(): Promise<boolean> {
    if (this.source()) return true;
    if (!this.savedUrl) return false;
    this.loading.set(true);
    try {
      const res = await fetch(this.savedUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.source.set(await res.blob());
      return true;
    } finally {
      this.loading.set(false);
    }
  }

  setCropped(blob: Blob) {
    this.revoke();
    this.objectUrl = URL.createObjectURL(blob);
    this.pending = blob;
    this.preview.set(this.objectUrl);
  }

  clear() {
    this.revoke();
    this.pending = null;
    this.savedUrl = null;
    this.source.set(null);
    this.preview.set(null);
  }

  /** Uploads the pending crop (if any) and returns the URL to store. */
  async resolveUrl(upload: (blob: Blob) => Promise<string>): Promise<string | null> {
    return this.pending ? upload(this.pending) : this.savedUrl;
  }

  destroy() {
    this.revoke();
  }

  private revoke() {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
  }
}
