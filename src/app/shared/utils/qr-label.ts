import QRCode from 'qrcode';
import { environment } from '../../../environments/environment';

/** The only thing encoded in the QR. Owner and pet data can change without re-manufacturing the collar. */
export const publicPetIdUrl = (qrToken: string) => `${publicBaseUrl()}/p/${qrToken}`;

export const publicBaseUrl = () => environment.publicBaseUrl || location.origin;

/** True while QR codes would point to a dev/preview origin instead of the production domain. */
export const isTemporaryBaseUrl = () => !environment.publicBaseUrl;

/** Accepts a full QR URL (/p/… or /activate/…) or a bare token, as typed or pasted by an owner. */
export function extractQrToken(input: string): string | null {
  const match = input.trim().match(/^(?:.*\/(?:p|activate)\/)?([A-Za-z0-9_-]{6,64})\/?(?:[?#].*)?$/);
  return match?.[1] ?? null;
}

export interface QrLabel {
  code: string;
  url: string;
}

// Label layout in millimetres: brand header, square QR (quiet zone included), PetID code.
const WIDTH = 40;
const HEADER = 9;
const FOOTER = 8;
const HEIGHT = HEADER + WIDTH + FOOTER;
const QUIET_ZONE = 4;
const INK = '#1c2733';
const BRAND = '#1a7e68';

/** Level Q survives ~25% damage: collars get scratched. */
function qrModules(url: string) {
  const { modules } = QRCode.create(url, { errorCorrectionLevel: 'Q' });
  const size = modules.size;
  const runs: { x: number; y: number; length: number }[] = [];
  for (let y = 0; y < size; y++) {
    let x = 0;
    while (x < size) {
      if (!modules.get(y, x)) {
        x++;
        continue;
      }
      const start = x;
      while (x < size && modules.get(y, x)) x++;
      runs.push({ x: start, y, length: x - start });
    }
  }
  return { size, runs, module: WIDTH / (size + QUIET_ZONE * 2) };
}

const escapeXml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);

/** Vector label at real size (40 × 57 mm). Scales without losing quality for engraving or printing. */
export function labelSvg({ code, url }: QrLabel): string {
  const { runs, module } = qrModules(url);
  const path = runs.map((r) => `M${r.x + QUIET_ZONE} ${r.y + QUIET_ZONE}h${r.length}v1h-${r.length}z`).join('');
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}mm" height="${HEIGHT}mm" viewBox="0 0 ${WIDTH} ${HEIGHT}">`,
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="#fff"/>`,
    `<text x="${WIDTH / 2}" y="6.6" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="5.2" fill="${INK}">Pet<tspan fill="${BRAND}">ID</tspan></text>`,
    `<g transform="translate(0 ${HEADER}) scale(${module})"><path d="${path}" fill="${INK}" shape-rendering="crispEdges"/></g>`,
    `<text x="${WIDTH / 2}" y="${HEADER + WIDTH + 4.6}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="4" letter-spacing="0.3" fill="${INK}">${escapeXml(code)}</text>`,
    `</svg>`,
  ].join('');
}

export const svgDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** High-resolution raster of the same label (default 1600 px wide ≈ 1000 dpi at 40 mm). */
export async function labelPng(label: QrLabel, widthPx = 1600): Promise<Blob> {
  const image = new Image();
  image.src = svgDataUrl(labelSvg(label));
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = widthPx;
  canvas.height = Math.round((widthPx * HEIGHT) / WIDTH);
  canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('png_failed'))), 'image/png'),
  );
}

// Helvetica-Bold advance widths (1/1000 em) for the characters used on labels.
const HELVETICA_BOLD: Record<string, number> = {
  P: 667, E: 667, T: 611, I: 278, D: 722, e: 556, t: 333, '-': 333, ' ': 278,
  '0': 556, '1': 556, '2': 556, '3': 556, '4': 556, '5': 556, '6': 556, '7': 556, '8': 556, '9': 556,
};
const textWidth = (text: string, size: number, spacing = 0) =>
  [...text].reduce((w, c) => w + ((HELVETICA_BOLD[c] ?? 667) / 1000) * size + spacing, 0) - spacing;

const pdfString = (text: string) => `(${text.replace(/[\\()]/g, (c) => `\\${c}`)})`;
const rgb = (hex: string) =>
  [1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(3)).join(' ');

/** Single-page vector PDF at the label's real size, using the built-in Helvetica font (no dependencies). */
export function labelPdf({ code, url }: QrLabel): Blob {
  const { runs, module } = qrModules(url);
  const pt = 72 / 25.4;
  const n = (v: number) => +v.toFixed(3);

  const rects = runs
    .map((r) => `${n((r.x + QUIET_ZONE) * module)} ${n(HEADER + (r.y + QUIET_ZONE) * module)} ${n(r.length * module)} ${n(module)} re`)
    .join('\n');
  const brandSize = 5.2;
  const brandX = (WIDTH - textWidth('PetID', brandSize)) / 2;
  const codeSize = 4;
  const codeSpacing = 0.3;
  const codeX = (WIDTH - textWidth(code, codeSize, codeSpacing)) / 2;

  // Work in millimetres with a top-left origin; text matrices flip glyphs back upright.
  const content = [
    'q',
    `1 1 1 rg 0 0 ${n(WIDTH * pt)} ${n(HEIGHT * pt)} re f`,
    `${n(pt)} 0 0 ${n(-pt)} 0 ${n(HEIGHT * pt)} cm`,
    `${rgb(INK)} rg`,
    rects,
    'f',
    `BT /F1 ${brandSize} Tf 1 0 0 -1 ${n(brandX)} 6.6 Tm ${rgb(INK)} rg ${pdfString('Pet')} Tj ${rgb(BRAND)} rg ${pdfString('ID')} Tj ET`,
    `BT /F1 ${codeSize} Tf ${codeSpacing} Tc 1 0 0 -1 ${n(codeX)} ${n(HEADER + WIDTH + 4.6)} Tm ${rgb(INK)} rg ${pdfString(code)} Tj ET`,
    'Q',
  ].join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(WIDTH * pt)} ${n(HEIGHT * pt)}] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Blob([pdf], { type: 'application/pdf' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Opens a print-ready A4 sheet with the labels at real size and dashed cut guides. */
export function printLabels(labels: QrLabel[]): boolean {
  const win = window.open('', '_blank');
  if (!win) return false;
  const items = labels
    .map((l) => `<figure><img src="${svgDataUrl(labelSvg(l))}" alt="${escapeXml(l.code)}"></figure>`)
    .join('');
  const title = labels.length === 1 ? labels[0].code : `${labels.length} PetIDs`;
  win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>PetID · ${escapeXml(title)}</title>
<style>
@page { size: A4; margin: 10mm; }
body { margin: 0; }
main { display: flex; flex-wrap: wrap; gap: 6mm; }
figure { margin: 0; padding: 2mm; outline: 0.2mm dashed #cbd5e1; break-inside: avoid; }
img { display: block; width: ${WIDTH}mm; height: ${HEIGHT}mm; }
</style></head><body><main>${items}</main>
<script>window.addEventListener('load', () => { window.focus(); window.print(); });</script>
</body></html>`);
  win.document.close();
  return true;
}
