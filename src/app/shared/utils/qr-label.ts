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

/**
 * `round`: 30 mm round plate with the brand and the QR only; the top stays clear for the ring hole.
 * `tag`: 40 × 57 mm rectangular label with brand, QR and the PetID code.
 */
export type LabelFormat = 'round' | 'tag';

export const LABEL_FORMATS: { value: LabelFormat; label: string }[] = [
  { value: 'round', label: 'Placa redonda 3 cm' },
  { value: 'tag', label: 'Etiqueta 4 × 5,7 cm' },
];

/** All measures in millimetres. `qr` is the QR box including its quiet zone (`quiet` modules per side). */
interface Layout {
  width: number;
  height: number;
  qr: { x: number; y: number; size: number; quiet: number };
  brand: { y: number; size: number };
  code?: { y: number; size: number; spacing: number };
  /** Draws the plate outline (a light guide circle) instead of a white rectangle. */
  plate?: boolean;
}

// Round: the QR's bottom corners stay ~1.5 mm inside the edge and the brand sits below a ~3 mm ring hole.
const LAYOUTS: Record<LabelFormat, Layout> = {
  tag: {
    width: 40,
    height: 57,
    qr: { x: 0, y: 9, size: 40, quiet: 4 },
    brand: { y: 6.6, size: 5.2 },
    code: { y: 53.6, size: 4, spacing: 0.3 },
  },
  round: {
    width: 30,
    height: 30,
    qr: { x: 5.5, y: 7.3, size: 19, quiet: 2 },
    brand: { y: 6.9, size: 3.4 },
    plate: true,
  },
};

const INK = '#1c2733';
const BRAND = '#1a7e68';
const GUIDE = '#cbd5e1';

/** Level Q survives ~25% damage: collars get scratched. */
function qrModules(url: string, { size: box, quiet }: Layout['qr']) {
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
      runs.push({ x: start + quiet, y: y + quiet, length: x - start });
    }
  }
  return { runs, module: box / (size + quiet * 2) };
}

const escapeXml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);

/** Vector label at real size. Scales without losing quality for engraving or printing. */
export function labelSvg({ code, url }: QrLabel, format: LabelFormat = 'tag'): string {
  const l = LAYOUTS[format];
  const { runs, module } = qrModules(url, l.qr);
  const path = runs.map((r) => `M${r.x} ${r.y}h${r.length}v1h-${r.length}z`).join('');
  const center = l.width / 2;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${l.width}mm" height="${l.height}mm" viewBox="0 0 ${l.width} ${l.height}">`,
    l.plate
      ? `<circle cx="${center}" cy="${l.height / 2}" r="${center - 0.1}" fill="#fff" stroke="${GUIDE}" stroke-width="0.15"/>`
      : `<rect width="${l.width}" height="${l.height}" fill="#fff"/>`,
    `<text x="${center}" y="${l.brand.y}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="${l.brand.size}" fill="${INK}">Pet<tspan fill="${BRAND}">ID</tspan></text>`,
    `<g transform="translate(${l.qr.x} ${l.qr.y}) scale(${module})"><path d="${path}" fill="${INK}" shape-rendering="crispEdges"/></g>`,
    l.code
      ? `<text x="${center}" y="${l.code.y}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="${l.code.size}" letter-spacing="${l.code.spacing}" fill="${INK}">${escapeXml(code)}</text>`
      : '',
    `</svg>`,
  ].join('');
}

export const svgDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** High-resolution raster of the same label (~1000 dpi by default). */
export async function labelPng(label: QrLabel, format: LabelFormat = 'tag', widthPx = LAYOUTS[format].width * 40): Promise<Blob> {
  const l = LAYOUTS[format];
  const image = new Image();
  image.src = svgDataUrl(labelSvg(label, format));
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = widthPx;
  canvas.height = Math.round((widthPx * l.height) / l.width);
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

/** Circle as four Bézier arcs, in PDF path syntax. */
function pdfCircle(cx: number, cy: number, r: number, n: (v: number) => number) {
  const k = 0.5523 * r;
  const p = (...values: number[]) => values.map(n).join(' ');
  return [
    `${p(cx + r, cy)} m`,
    `${p(cx + r, cy + k, cx + k, cy + r, cx, cy + r)} c`,
    `${p(cx - k, cy + r, cx - r, cy + k, cx - r, cy)} c`,
    `${p(cx - r, cy - k, cx - k, cy - r, cx, cy - r)} c`,
    `${p(cx + k, cy - r, cx + r, cy - k, cx + r, cy)} c`,
  ].join(' ');
}

/** Single-page vector PDF at the label's real size, using the built-in Helvetica font (no dependencies). */
export function labelPdf({ code, url }: QrLabel, format: LabelFormat = 'tag'): Blob {
  const l = LAYOUTS[format];
  const { runs, module } = qrModules(url, l.qr);
  const pt = 72 / 25.4;
  const n = (v: number) => +v.toFixed(3);
  const center = l.width / 2;

  const rects = runs
    .map((r) => `${n(l.qr.x + r.x * module)} ${n(l.qr.y + r.y * module)} ${n(r.length * module)} ${n(module)} re`)
    .join('\n');
  const brandX = center - textWidth('PetID', l.brand.size) / 2;

  // Work in millimetres with a top-left origin; text matrices flip glyphs back upright.
  const content = [
    'q',
    `1 1 1 rg 0 0 ${n(l.width * pt)} ${n(l.height * pt)} re f`,
    `${n(pt)} 0 0 ${n(-pt)} 0 ${n(l.height * pt)} cm`,
    l.plate ? `1 1 1 rg ${rgb(GUIDE)} RG 0.15 w ${pdfCircle(center, l.height / 2, center - 0.1, n)} B` : '',
    `${rgb(INK)} rg`,
    rects,
    'f',
    `BT /F1 ${l.brand.size} Tf 1 0 0 -1 ${n(brandX)} ${l.brand.y} Tm ${rgb(INK)} rg ${pdfString('Pet')} Tj ${rgb(BRAND)} rg ${pdfString('ID')} Tj ET`,
    l.code
      ? `BT /F1 ${l.code.size} Tf ${l.code.spacing} Tc 1 0 0 -1 ${n(center - textWidth(code, l.code.size, l.code.spacing) / 2)} ${l.code.y} Tm ${rgb(INK)} rg ${pdfString(code)} Tj ET`
      : '',
    'Q',
  ]
    .filter(Boolean)
    .join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(l.width * pt)} ${n(l.height * pt)}] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>`,
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

/** Opens a print-ready A4 sheet with the labels at real size (tags get dashed cut guides). */
export function printLabels(labels: QrLabel[], format: LabelFormat = 'tag'): boolean {
  const l = LAYOUTS[format];
  const win = window.open('', '_blank');
  if (!win) return false;
  const items = labels
    .map((label) => `<figure><img src="${svgDataUrl(labelSvg(label, format))}" alt="${escapeXml(label.code)}"></figure>`)
    .join('');
  const title = labels.length === 1 ? labels[0].code : `${labels.length} PetIDs`;
  win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>PetID · ${escapeXml(title)}</title>
<style>
@page { size: A4; margin: 10mm; }
body { margin: 0; }
main { display: flex; flex-wrap: wrap; gap: ${l.plate ? 4 : 6}mm; }
figure { margin: 0; padding: ${l.plate ? 0 : 2}mm; outline: ${l.plate ? 'none' : '0.2mm dashed #cbd5e1'}; break-inside: avoid; }
img { display: block; width: ${l.width}mm; height: ${l.height}mm; }
</style></head><body><main>${items}</main>
<script>window.addEventListener('load', () => { window.focus(); window.print(); });</script>
</body></html>`);
  win.document.close();
  return true;
}

const FORMAT_KEY = 'petid.labelFormat';

/** Last format chosen in the admin (the plates being manufactured are round by default). */
export function savedLabelFormat(): LabelFormat {
  const saved = localStorage.getItem(FORMAT_KEY);
  return saved === 'tag' || saved === 'round' ? saved : 'round';
}

export function saveLabelFormat(format: LabelFormat) {
  localStorage.setItem(FORMAT_KEY, format);
}
