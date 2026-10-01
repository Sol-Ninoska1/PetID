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
  /** Printed above the QR on round plates. Optional: plates can be made before the sale. */
  name?: string | null;
}

/**
 * `round`: 30 mm round plate: pet name, light QR on green with the PetID logo in the middle, and "Escanéame".
 * `tag`: 40 × 57 mm rectangular label with brand, QR and the PetID code.
 */
export type LabelFormat = 'round' | 'tag';

/** Round plates also have a back (the PetID paw), the same for every plate. */
export type LabelSide = 'front' | 'back';

export const LABEL_FORMATS: { value: LabelFormat; label: string }[] = [
  { value: 'round', label: 'Placa redonda 3 cm' },
  { value: 'tag', label: 'Etiqueta 4 × 5,7 cm' },
];

/** Label sizes in millimetres. */
const SIZES: Record<LabelFormat, { width: number; height: number }> = {
  tag: { width: 40, height: 57 },
  round: { width: 30, height: 30 },
};

const INK = '#1c2733';
const BRAND = '#1a7e68';
const PLATE = '#155145';
const LIGHT = '#eef6f3';
const GUIDE = '#cbd5e1';
const WHITE = '#ffffff';
const FONT = 'Helvetica, Arial, sans-serif';

type Cmd = ['M', number, number] | ['L', number, number] | ['C', number, number, number, number, number, number] | ['Z'];
type Run = { x: number; y: number; length: number };
type Span = { text: string; fill: string };
/** Drawing primitives in millimetres (top-left origin), rendered to both SVG and PDF. */
type Shape =
  | { kind: 'path'; d: Cmd[]; fill?: string; stroke?: string; strokeWidth?: number }
  | { kind: 'qr'; x: number; y: number; module: number; runs: Run[]; fill: string }
  | { kind: 'text'; x: number; y: number; size: number; spacing?: number; spans: Span[] };

const brandSpans = (pet = INK): Span[] => [
  { text: 'Pet', fill: pet },
  { text: 'ID', fill: BRAND },
];

/** Level Q survives ~25% damage: collars get scratched and round plates hide the centre under the logo. */
function qrRuns(url: string, skip?: (x: number, y: number, size: number) => boolean) {
  const { modules } = QRCode.create(url, { errorCorrectionLevel: 'Q' });
  const size = modules.size;
  const dark = (x: number, y: number) => modules.get(y, x) && !skip?.(x, y, size);
  const runs: Run[] = [];
  for (let y = 0; y < size; y++) {
    let x = 0;
    while (x < size) {
      if (!dark(x, y)) {
        x++;
        continue;
      }
      const start = x;
      while (x < size && dark(x, y)) x++;
      runs.push({ x: start, y, length: x - start });
    }
  }
  return { size, runs };
}

const K = 0.5523;

const rect = (x: number, y: number, w: number, h: number): Cmd[] => [['M', x, y], ['L', x + w, y], ['L', x + w, y + h], ['L', x, y + h], ['Z']];

function circle(cx: number, cy: number, r: number): Cmd[] {
  const k = K * r;
  return [
    ['M', cx + r, cy],
    ['C', cx + r, cy + k, cx + k, cy + r, cx, cy + r],
    ['C', cx - k, cy + r, cx - r, cy + k, cx - r, cy],
    ['C', cx - r, cy - k, cx - k, cy - r, cx, cy - r],
    ['C', cx + k, cy - r, cx + r, cy - k, cx + r, cy],
    ['Z'],
  ];
}

function roundedRect(x: number, y: number, w: number, h: number, r: number): Cmd[] {
  const k = K * r;
  return [
    ['M', x + r, y],
    ['L', x + w - r, y],
    ['C', x + w - r + k, y, x + w, y + r - k, x + w, y + r],
    ['L', x + w, y + h - r],
    ['C', x + w, y + h - r + k, x + w - r + k, y + h, x + w - r, y + h],
    ['L', x + r, y + h],
    ['C', x + r - k, y + h, x, y + h - r + k, x, y + h - r],
    ['L', x, y + r],
    ['C', x, y + r - k, x + r - k, y, x + r, y],
    ['Z'],
  ];
}

// Filled paw on a 24-unit grid: four toes and the main pad.
const PAW_TOES = [
  [5.2, 10.4, 2.2],
  [9.3, 5.6, 2.3],
  [14.7, 5.6, 2.3],
  [18.8, 10.4, 2.2],
];
const PAW_PAD = [
  [9.3, 11.6, 6.4, 15.3, 6.4, 17.9],
  [6.4, 19.7, 7.8, 20.8, 9.5, 20.8],
  [10.6, 20.8, 11.1, 20.2, 12, 20.2],
  [12.9, 20.2, 13.4, 20.8, 14.5, 20.8],
  [16.2, 20.8, 17.6, 19.7, 17.6, 17.9],
  [17.6, 15.3, 14.7, 11.6, 12, 11.6],
];

/** Paw scaled into a `size` mm square whose top-left corner is (x, y). */
function paw(x: number, y: number, size: number): Cmd[] {
  const s = size / 24;
  const px = (u: number) => x + u * s;
  const py = (v: number) => y + v * s;
  const toes = PAW_TOES.flatMap(([u, v, r]) => circle(px(u), py(v), r * s));
  const pad: Cmd[] = [
    ['M', px(12), py(11.6)],
    ...PAW_PAD.map(([a, b, c, d, e, f]): Cmd => ['C', px(a), py(b), px(c), py(d), px(e), py(f)]),
    ['Z'],
  ];
  return [...toes, ...pad];
}

function tagFront({ code, url }: QrLabel): Shape[] {
  const quiet = 4;
  const { size, runs } = qrRuns(url);
  const module = 40 / (size + quiet * 2);
  return [
    { kind: 'path', d: rect(0, 0, 40, 57), fill: WHITE },
    { kind: 'text', x: 20, y: 6.6, size: 5.2, spans: brandSpans() },
    { kind: 'qr', x: quiet * module, y: 9 + quiet * module, module, runs, fill: INK },
    { kind: 'text', x: 20, y: 53.6, size: 4, spacing: 0.3, spans: [{ text: code, fill: INK }] },
  ];
}

// 30 mm plate: the QR corners stay ~2.5 mm inside the rim; the name and "Escanéame" sit in the arcs above and below,
// at least ~2 modules away from the QR. Logos of 5.2 mm and up stop decoding reliably; 4.2 mm leaves room for scratches.
const ROUND = {
  qr: 16.5,
  qrTop: 6.95,
  logo: 4.2,
  name: { y: 5.55, max: 3, min: 1.6, width: 13.5 },
  scan: { y: 26, size: 2.2 },
};

function roundFront({ url, name }: QrLabel): Shape[] {
  const c = 15;
  const { qr, qrTop, logo } = ROUND;
  const hole = { from: (qr - logo) / 2 - 0.25, to: (qr + logo) / 2 + 0.25 };
  const { size, runs } = qrRuns(url, (x, y, n) => {
    const m = qr / n;
    return (x + 1) * m > hole.from && x * m < hole.to && (y + 1) * m > hole.from && y * m < hole.to;
  });
  const logoLeft = c - logo / 2;
  const logoTop = qrTop + (qr - logo) / 2;
  const shapes: Shape[] = [
    { kind: 'path', d: circle(c, c, 15), fill: PLATE },
    { kind: 'path', d: circle(c, c, 14.35), stroke: LIGHT, strokeWidth: 0.3 },
    { kind: 'qr', x: c - qr / 2, y: qrTop, module: qr / size, runs, fill: LIGHT },
    { kind: 'path', d: roundedRect(logoLeft, logoTop, logo, logo, logo * 0.19), fill: WHITE },
    { kind: 'path', d: paw(c - logo / 4, logoTop + logo * 0.07, logo / 2), fill: BRAND },
    { kind: 'text', x: c, y: logoTop + logo * 0.86, size: logo * 0.29, spans: brandSpans() },
    { kind: 'text', x: c, y: ROUND.scan.y, size: ROUND.scan.size, spacing: 0.05, spans: [{ text: 'Escanéame', fill: LIGHT }] },
  ];
  const label = name?.trim();
  if (label) {
    const { y, max, min, width } = ROUND.name;
    const fit = Math.min(max, Math.max(min, width / textWidth(label, 1)));
    shapes.push({ kind: 'text', x: c, y, size: fit, spans: [{ text: label, fill: LIGHT }] });
  }
  return shapes;
}

function roundBack(): Shape[] {
  return [
    { kind: 'path', d: circle(15, 15, 14.9), fill: WHITE, stroke: GUIDE, strokeWidth: 0.15 },
    { kind: 'path', d: paw(5, 4.9, 20), fill: PLATE },
  ];
}

function shapesFor(label: QrLabel, format: LabelFormat, side: LabelSide): Shape[] {
  if (format === 'tag') return tagFront(label);
  return side === 'back' ? roundBack() : roundFront(label);
}

const num = (v: number) => +v.toFixed(3);

const escapeXml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);

const svgPath = (d: Cmd[]) => d.map(([op, ...v]) => op + v.map(num).join(' ')).join('');

function svgShape(s: Shape): string {
  switch (s.kind) {
    case 'path':
      return `<path d="${svgPath(s.d)}" fill="${s.fill ?? 'none'}"${s.stroke ? ` stroke="${s.stroke}" stroke-width="${s.strokeWidth}"` : ''}/>`;
    case 'qr': {
      const d = s.runs.map((r) => `M${r.x} ${r.y}h${r.length}v1h-${r.length}z`).join('');
      return `<g transform="translate(${num(s.x)} ${num(s.y)}) scale(${s.module})"><path d="${d}" fill="${s.fill}" shape-rendering="crispEdges"/></g>`;
    }
    case 'text': {
      const spans = s.spans.map((sp) => `<tspan fill="${sp.fill}">${escapeXml(sp.text)}</tspan>`).join('');
      const spacing = s.spacing ? ` letter-spacing="${s.spacing}"` : '';
      return `<text x="${num(s.x)}" y="${num(s.y)}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="${num(s.size)}"${spacing}>${spans}</text>`;
    }
  }
}

/** Vector label at real size. Scales without losing quality for engraving or printing. */
export function labelSvg(label: QrLabel, format: LabelFormat = 'tag', side: LabelSide = 'front'): string {
  const { width, height } = SIZES[format];
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}">`,
    ...shapesFor(label, format, side).map(svgShape),
    `</svg>`,
  ].join('');
}

export const svgDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** High-resolution raster of the same label (~1000 dpi). */
export async function labelPng(label: QrLabel, format: LabelFormat = 'tag', side: LabelSide = 'front'): Promise<Blob> {
  const { width, height } = SIZES[format];
  const image = new Image();
  image.src = svgDataUrl(labelSvg(label, format, side));
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = width * 40;
  canvas.height = height * 40;
  canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('png_failed'))), 'image/png'),
  );
}

// Helvetica-Bold advance widths (1/1000 em); accented letters use their base letter.
const HELVETICA_BOLD: Record<string, number> = Object.fromEntries(
  (
    [
      [238, "'"],
      [278, ' ,./Iijl'],
      [333, '!():;-ft'],
      [389, '*r'],
      [500, 'z'],
      [556, '#$0123456789Jacesvxyk'],
      [584, '+<=>'],
      [611, '?FLTZbdghnopqu'],
      [667, 'EPSVXY'],
      [722, '&ABCDHKNRU'],
      [778, 'GOQw'],
      [833, 'M'],
      [889, '%m'],
      [944, 'W'],
      [975, '@'],
    ] as const
  ).flatMap(([w, chars]) => [...chars].map((c) => [c, w])),
);
const charWidth = (c: string) => HELVETICA_BOLD[c] ?? HELVETICA_BOLD[c.normalize('NFD')[0]] ?? 611;
const textWidth = (text: string, size: number, spacing = 0) =>
  [...text].reduce((w, c) => w + (charWidth(c) / 1000) * size + spacing, 0) - spacing;

/** PDF strings are written byte by byte in WinAnsi, which matches Latin-1 for accents and ñ. */
const toLatin1 = (text: string) =>
  [...text].map((c) => (/^[\x20-\x7e\xa0-\xff]$/.test(c) ? c : '?')).join('');
const pdfString = (text: string) => `(${toLatin1(text).replace(/[\\()]/g, (c) => `\\${c}`)})`;
const rgb = (hex: string) =>
  [1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(3)).join(' ');

const PDF_OPS = { M: 'm', L: 'l', C: 'c' } as const;
const pdfPath = (d: Cmd[]) =>
  d.map(([op, ...v]) => (op === 'Z' ? 'h' : `${v.map(num).join(' ')} ${PDF_OPS[op]}`)).join(' ');

function pdfShape(s: Shape): string {
  switch (s.kind) {
    case 'path': {
      const paint = s.fill && s.stroke ? 'B' : s.fill ? 'f' : 'S';
      const fill = s.fill ? `${rgb(s.fill)} rg ` : '';
      const stroke = s.stroke ? `${rgb(s.stroke)} RG ${s.strokeWidth} w ` : '';
      return `${fill}${stroke}${pdfPath(s.d)} ${paint}`;
    }
    case 'qr': {
      const m = s.module;
      const rects = s.runs.map((r) => `${num(s.x + r.x * m)} ${num(s.y + r.y * m)} ${num(r.length * m)} ${num(m)} re`);
      return [`${rgb(s.fill)} rg`, ...rects, 'f'].join('\n');
    }
    case 'text': {
      const spacing = s.spacing ?? 0;
      const x = s.x - textWidth(s.spans.map((sp) => sp.text).join(''), s.size, spacing) / 2;
      const spans = s.spans.map((sp) => `${rgb(sp.fill)} rg ${pdfString(sp.text)} Tj`).join(' ');
      return `BT /F1 ${num(s.size)} Tf ${spacing} Tc 1 0 0 -1 ${num(x)} ${num(s.y)} Tm ${spans} ET`;
    }
  }
}

/** Single-page vector PDF at the label's real size, using the built-in Helvetica font (no dependencies). */
export function labelPdf(label: QrLabel, format: LabelFormat = 'tag', side: LabelSide = 'front'): Blob {
  const { width, height } = SIZES[format];
  const pt = 72 / 25.4;

  // Work in millimetres with a top-left origin; text matrices flip glyphs back upright.
  const content = ['q', `${num(pt)} 0 0 ${num(-pt)} 0 ${num(height * pt)} cm`, ...shapesFor(label, format, side).map(pdfShape), 'Q'].join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(width * pt)} ${num(height * pt)}] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>`,
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
  return new Blob([Uint8Array.from(pdf, (c) => c.charCodeAt(0))], { type: 'application/pdf' });
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
export function printLabels(labels: QrLabel[], format: LabelFormat = 'tag', side: LabelSide = 'front'): boolean {
  const { width, height } = SIZES[format];
  const round = format === 'round';
  const win = window.open('', '_blank');
  if (!win) return false;
  const items = labels
    .map((label) => `<figure><img src="${svgDataUrl(labelSvg(label, format, side))}" alt="${escapeXml(label.code)}"></figure>`)
    .join('');
  const title = labels.length === 1 ? labels[0].code : `${labels.length} PetIDs`;
  win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>PetID · ${escapeXml(title)}</title>
<style>
@page { size: A4; margin: 10mm; }
body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
main { display: flex; flex-wrap: wrap; gap: ${round ? 4 : 6}mm; }
figure { margin: 0; padding: ${round ? 0 : 2}mm; outline: ${round ? 'none' : '0.2mm dashed #cbd5e1'}; break-inside: avoid; }
img { display: block; width: ${width}mm; height: ${height}mm; }
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
