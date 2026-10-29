/**
 * Target shapes for the frost field. Each generator returns `count` points (x, y pairs, in
 * pixels relative to the zone's top-left) that the crystals freeze into.
 *
 * Line-based emblems are sampled along their strokes in proportion to length, so density stays
 * even whatever the shape; text is sampled from rendered glyph pixels.
 */
import { createRandom } from '@snowbros/fx';
import { buildLattice } from '../lattice/geometry';

export type EmblemKind =
  | 'graph'
  | 'play'
  | 'molecule'
  | 'transfer'
  | 'lattice'
  | 'mark'
  | 'ledger'
  | 'book';

type Seg = [number, number, number, number];

const TAU = Math.PI * 2;

function arc(cx: number, cy: number, r: number, a0: number, a1: number, steps = 48): Seg[] {
  const out: Seg[] = [];
  for (let i = 0; i < steps; i++) {
    const t0 = a0 + ((a1 - a0) * i) / steps;
    const t1 = a0 + ((a1 - a0) * (i + 1)) / steps;
    out.push([
      cx + Math.cos(t0) * r,
      cy + Math.sin(t0) * r,
      cx + Math.cos(t1) * r,
      cy + Math.sin(t1) * r,
    ]);
  }
  return out;
}

function poly(points: [number, number][], closed = true): Seg[] {
  const out: Seg[] = [];
  const n = closed ? points.length : points.length - 1;
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    if (a && b) out.push([a[0], a[1], b[0], b[1]]);
  }
  return out;
}

function hexagon(cx: number, cy: number, r: number, rot = 0): Seg[] {
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = rot + (i * TAU) / 6;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return poly(pts);
}

/** Emblems in a unit space roughly −1..1 on both axes. */
function emblemSegments(kind: EmblemKind): Seg[] {
  switch (kind) {
    case 'graph': {
      // An import graph: nodes on three ranks, edges between them, one cycle closed in signal.
      const nodes: [number, number][] = [
        [-0.8, -0.7],
        [-0.1, -0.85],
        [0.7, -0.6],
        [-0.55, -0.05],
        [0.2, 0.05],
        [0.85, 0.15],
        [-0.75, 0.7],
        [0.0, 0.8],
        [0.6, 0.75],
      ];
      const edges: [number, number][] = [
        [0, 3],
        [0, 4],
        [1, 4],
        [2, 4],
        [2, 5],
        [3, 6],
        [3, 7],
        [4, 7],
        [4, 8],
        [5, 8],
        [7, 8],
        [8, 4],
      ];
      const segs: Seg[] = [];
      for (const [a, b] of edges) {
        const p = nodes[a];
        const q = nodes[b];
        if (p && q) segs.push([p[0], p[1], q[0], q[1]]);
      }
      for (const [x, y] of nodes) segs.push(...arc(x, y, 0.09, 0, TAU, 14));
      return segs;
    }
    case 'play': {
      // A ring and the play mark inside it.
      const segs = arc(0, 0, 0.92, 0, TAU, 72);
      segs.push(...arc(0, 0, 0.8, 0, TAU, 64));
      segs.push(
        ...poly([
          [-0.28, -0.42],
          [0.44, 0],
          [-0.28, 0.42],
        ]),
      );
      segs.push(
        ...poly([
          [-0.2, -0.28],
          [0.27, 0],
          [-0.2, 0.28],
        ]),
      );
      return segs;
    }
    case 'molecule': {
      // Three fused aromatic rings and two substituents.
      const r = 0.34;
      const dx = r * Math.sqrt(3);
      const segs = [
        ...hexagon(-dx, 0.1, r, Math.PI / 6),
        ...hexagon(0, 0.1, r, Math.PI / 6),
        ...hexagon(dx * 0.5, -0.42, r, Math.PI / 6),
      ];
      segs.push(...arc(-dx, 0.1, r * 0.55, 0, TAU, 20));
      segs.push(...arc(dx * 0.5, -0.42, r * 0.55, 0, TAU, 20));
      segs.push(
        [0, 0.1 + r, 0, 0.1 + r + 0.38],
        [-dx - r * 0.86, 0.1 + r * 0.5, -dx - r * 0.86 - 0.3, 0.1 + r * 0.5 + 0.18],
      );
      segs.push(...arc(0, 0.1 + r + 0.46, 0.08, 0, TAU, 12));
      return segs;
    }
    case 'transfer': {
      // Phone and screen, joined by a dotted arc.
      const segs = poly([
        [-0.95, -0.55],
        [-0.55, -0.55],
        [-0.55, 0.55],
        [-0.95, 0.55],
      ]);
      segs.push([-0.83, 0.42, -0.67, 0.42]);
      segs.push(
        ...poly([
          [0.25, -0.45],
          [0.95, -0.45],
          [0.95, 0.2],
          [0.25, 0.2],
        ]),
      );
      segs.push([0.6, 0.2, 0.6, 0.42], [0.42, 0.42, 0.78, 0.42]);
      const dots = arc(-0.15, 0.1, 0.62, Math.PI * 1.12, Math.PI * 1.88, 18);
      segs.push(...dots.filter((_, i) => i % 2 === 0));
      return segs;
    }
    case 'lattice': {
      const lat = buildLattice({ seed: 11, detail: 0.62, relief: 0 });
      return lat.segments.map((s) => [s.a[0] * 0.95, s.a[1] * 0.95, s.b[0] * 0.95, s.b[1] * 0.95]);
    }
    case 'ledger': {
      // Two columns of entries meeting at a settled line: owed in, owed out, balanced.
      const segs: Seg[] = [
        [-0.9, -0.7, 0.9, -0.7],
        [0, -0.7, 0, 0.62],
        [-0.9, 0.62, 0.9, 0.62],
        [-0.9, 0.76, 0.9, 0.76],
      ];
      for (let i = 0; i < 5; i++) {
        const y = -0.5 + i * 0.24;
        segs.push([-0.8, y, -0.8 + 0.3 + ((i * 37) % 5) * 0.08, y]);
        segs.push([0.1, y, 0.1 + 0.25 + ((i * 53) % 5) * 0.09, y]);
      }
      return segs;
    }
    case 'book': {
      // An open book: two pages from one spine.
      const segs: Seg[] = [];
      for (const side of [-1, 1]) {
        segs.push(
          ...poly(
            [
              [0, -0.55],
              [side * 0.92, -0.72],
              [side * 0.92, 0.62],
              [0, 0.78],
            ],
            false,
          ),
        );
        for (let i = 0; i < 4; i++) {
          const y = -0.38 + i * 0.26;
          segs.push([side * 0.18, y + 0.02 * i, side * 0.74, y - 0.04]);
        }
      }
      segs.push([0, -0.55, 0, 0.78]);
      return segs;
    }
    case 'mark': {
      // The studio mark (brand/masters/symbol): a flat-top hexagon cut twice into an S. Three
      // equal bars; each cut's blind end runs parallel to the hexagon edge.
      const k = Math.sqrt(3);
      const top = -k / 2;
      const cut = 30 / 124;
      const bar = (k - 2 * cut) / 3;
      const join = (44 * 2) / k / 124;
      const rx = (y: number) => 1 - Math.abs(y) / k;
      const y1 = top + bar;
      const y2 = y1 + cut;
      return poly([
        [-0.5, top],
        [0.5, top],
        [rx(y1), y1],
        [-rx(y1) + join, y1],
        [-rx(y2) + join, y2],
        [rx(y2), y2],
        [1, 0],
        [0.5, -top],
        [-0.5, -top],
        [-rx(y1), -y1],
        [rx(y1) - join, -y1],
        [rx(y2) - join, -y2],
        [-rx(y2), -y2],
        [-1, 0],
      ]);
    }
  }
}

function sampleSegments(segs: Seg[], count: number, seed: number): Float32Array {
  const rand = createRandom(seed);
  const lengths = segs.map(([x0, y0, x1, y1]) => Math.hypot(x1 - x0, y1 - y0));
  const total = lengths.reduce((a, b) => a + b, 0) || 1;
  const out = new Float32Array(count * 2);
  // Evenly spaced along the total length, with a little jitter so it reads as grown, not plotted.
  let si = 0;
  let acc = 0;
  for (let i = 0; i < count; i++) {
    const d = ((i + rand() * 0.6) / count) * total;
    while (si < segs.length - 1 && acc + (lengths[si] ?? 0) < d) {
      acc += lengths[si] ?? 0;
      si++;
    }
    const seg = segs[si];
    const len = lengths[si] || 1;
    if (!seg) continue;
    const t = Math.min(1, Math.max(0, (d - acc) / len));
    const j = 0.012;
    out[i * 2] = seg[0] + (seg[2] - seg[0]) * t + (rand() - 0.5) * j;
    out[i * 2 + 1] = seg[1] + (seg[3] - seg[1]) * t + (rand() - 0.5) * j;
  }
  return out;
}

/** Points for an emblem fitted (aspect kept) into a `w × h` zone. */
export function emblemPoints(kind: EmblemKind, w: number, h: number, count: number): Float32Array {
  const unit = sampleSegments(emblemSegments(kind), count, kind.length * 97);
  const s = Math.min(w, h) * 0.46;
  for (let i = 0; i < count; i++) {
    unit[i * 2] = w / 2 + (unit[i * 2] ?? 0) * s;
    unit[i * 2 + 1] = h / 2 + (unit[i * 2 + 1] ?? 0) * s;
  }
  return unit;
}

/**
 * Points sampled from rendered text. `lines` are drawn stacked, each scaled to the zone width,
 * in the site's display face (fonts must be loaded first). Falls back to the mark if nothing
 * rasterised (no 2D context, zero-size zone).
 */
export function textPoints(
  lines: string[],
  w: number,
  h: number,
  count: number,
  font: string,
): Float32Array {
  const scale = Math.min(1, 900 / Math.max(w, h)); // rasterise small: sampling is all we need
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx || cw < 8 || ch < 8) return emblemPoints('mark', w, h, count);

  const lineH = ch / lines.length;
  const inset = 0.94; // keep the outer strokes off the zone edge
  (ctx as CanvasRenderingContext2D & { fontStretch?: string }).fontStretch = 'expanded';
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'alphabetic';
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i] ?? '';
    // Size each line to the full width, capped by the line's share of the height.
    let size = lineH;
    ctx.font = `${font.replace('{size}', `${size}px`)}`;
    const m = ctx.measureText(text);
    size = Math.min(lineH * 0.98, (size * cw * inset) / Math.max(1, m.width));
    ctx.font = `${font.replace('{size}', `${size}px`)}`;
    const mm = ctx.measureText(text);
    const asc = mm.actualBoundingBoxAscent;
    const desc = mm.actualBoundingBoxDescent;
    const y = lineH * i + (lineH + asc - desc) / 2;
    ctx.fillText(text, (cw - mm.width) / 2, y);
  }

  return sampleCanvas(ctx, cw, ch, scale, w, h, count, lines.join('').length * 31);
}

/**
 * Points sampled from the logo artwork itself (an inline `<svg>` of filled paths), fitted to the
 * zone width and centred. Used for the wordmark so its crystals carry the hexagonal O's.
 */
export function svgPoints(svg: SVGSVGElement, w: number, h: number, count: number): Float32Array {
  const vb = svg.viewBox.baseVal;
  const scale = Math.min(1, 900 / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx || cw < 8 || ch < 8 || !vb || vb.width <= 0) return emblemPoints('mark', w, h, count);

  const fit = Math.min((cw * 0.94) / vb.width, (ch * 0.98) / vb.height);
  ctx.translate((cw - vb.width * fit) / 2, (ch - vb.height * fit) / 2);
  ctx.scale(fit, fit);
  ctx.fillStyle = '#000';
  for (const path of svg.querySelectorAll('path')) {
    ctx.fill(new Path2D(path.getAttribute('d') ?? ''), 'evenodd');
  }
  return sampleCanvas(ctx, cw, ch, scale, w, h, count, 8 * 31);
}

function sampleCanvas(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  scale: number,
  w: number,
  h: number,
  count: number,
  seed: number,
): Float32Array {
  const data = ctx.getImageData(0, 0, cw, ch).data;
  const filled: number[] = [];
  const step = Math.max(1, Math.floor(Math.sqrt((cw * ch) / (count * 6))));
  for (let y = 0; y < ch; y += step) {
    for (let x = 0; x < cw; x += step) {
      if ((data[(y * cw + x) * 4 + 3] ?? 0) > 128) filled.push(x, y);
    }
  }
  if (filled.length < 4) return emblemPoints('mark', w, h, count);

  const rand = createRandom(seed);
  const out = new Float32Array(count * 2);
  const n = filled.length / 2;
  for (let i = 0; i < count; i++) {
    const k = Math.floor(rand() * n) * 2;
    out[i * 2] = ((filled[k] ?? 0) + (rand() - 0.5) * step) / scale;
    out[i * 2 + 1] = ((filled[k + 1] ?? 0) + (rand() - 0.5) * step) / scale;
  }
  return out;
}
