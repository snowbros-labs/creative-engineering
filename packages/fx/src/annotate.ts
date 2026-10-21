import { createScope, type Ease, type PatternHandle, type Seekable } from '@snowbros/core';
import { inView } from '@snowbros/motion';
import { type DrawPathHandle, drawPath } from './draw.js';
import { createRandom } from './noise.js';

export type AnnotationType = 'underline' | 'circle' | 'box' | 'strike' | 'cross' | 'bracket';

export interface AnnotateOptions {
  /** Mark style. Default `underline`. */
  type?: AnnotationType;
  /** Stroke colour. Default `currentColor`. */
  color?: string;
  /** Stroke width in px. Default 2. */
  strokeWidth?: number;
  /** Space between the text box and the mark, px. Default 6. */
  padding?: number;
  /** 0 = ruler-straight … 1 = loose felt-tip. Default 0.5. */
  roughness?: number;
  /** Second, slightly offset pass like a real pen going over twice. Default true for underline/strike. */
  double?: boolean;
  /** Same seed → same wobble (stable across renders). Default 1. */
  seed?: number;
  /** Seconds to draw. Default 0.8. */
  duration?: number;
  ease?: Ease;
  /** `inview` (default) draws when the element enters the viewport; `manual` waits for `play()`. */
  trigger?: 'inview' | 'manual';
  /** Delay after entering view, seconds. Default 0.15. */
  delay?: number;
}

export interface AnnotateHandle extends PatternHandle, Seekable {
  play(): Promise<void>;
  /** Rebuild the mark from current layout (called automatically on resize). */
  refresh(): void;
}

const f = (n: number) => n.toFixed(2);

/** A wobbly line from a to b: a few control points nudged by seeded noise. */
function roughLine(
  rand: () => number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  amp: number,
): string {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = -(y2 - y1) / len;
  const ny = (x2 - x1) / len;
  const j = () => (rand() - 0.5) * 2 * amp;
  const steps = Math.max(2, Math.round(len / 60));
  // Pen strokes start a touch early and overshoot a touch late.
  let d = `M${f(x1 - (x2 - x1) * 0.01 + nx * j())} ${f(y1 + ny * j())}`;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t + nx * j();
    const y = y1 + (y2 - y1) * t + ny * j();
    const cx = x1 + (x2 - x1) * (t - 0.5 / steps) + nx * j() * 1.4;
    const cy = y1 + (y2 - y1) * (t - 0.5 / steps) + ny * j() * 1.4;
    d += `Q${f(cx)} ${f(cy)} ${f(x)} ${f(y)}`;
  }
  return d;
}

/** A hand-drawn ellipse: slightly more than one turn, radius drifting smoothly (no jitter). */
function roughEllipse(
  rand: () => number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  amp: number,
) {
  const start = -Math.PI * (0.62 + rand() * 0.2);
  const turns = 1.08 + rand() * 0.08;
  // Two slow harmonics give a hand's uneven pressure; the radius opens slightly as it closes,
  // so the end overshoots the start like a real pen loop.
  const p1 = rand() * Math.PI * 2;
  const p2 = rand() * Math.PI * 2;
  const k = 0.012 * amp;
  const n = 64;
  let d = '';
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = start + t * turns * Math.PI * 2;
    const drift = 1 + k * Math.sin(a * 2 + p1) + k * 0.6 * Math.sin(a * 3 + p2) + t * 0.06;
    const x = cx + Math.cos(a) * rx * drift;
    const y = cy + Math.sin(a) * ry * drift;
    d += `${i ? 'L' : 'M'}${f(x)} ${f(y)}`;
  }
  return d;
}

/**
 * Hand-drawn annotation ("redline") over text or any element: underline, circle, box,
 * strike-through, cross-out or bracket — generated as a seeded wobbly SVG path and drawn with
 * `drawPath`. The SVG is decorative (`aria-hidden`), ignores pointer input, and follows layout
 * changes. Multi-line inline text gets one underline/strike per line box.
 *
 * Reduced motion: appears fully drawn (drawPath policy). Inspired by editors' markup, not a
 * port of any library.
 */
export function annotate(el: HTMLElement, options: AnnotateOptions = {}): AnnotateHandle {
  const scope = createScope();
  const type = options.type ?? 'underline';
  const pad = options.padding ?? 6;
  const rough = Math.max(0, Math.min(1, options.roughness ?? 0.5));
  const width = options.strokeWidth ?? 2;
  const doublePass = options.double ?? (type === 'underline' || type === 'strike');
  const ns = 'http://www.w3.org/2000/svg';

  const prevPosition = el.style.position;
  const pos = getComputedStyle(el).position;
  if (!pos || pos === 'static') el.style.position = 'relative';

  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.style.cssText =
    'position:absolute;left:0;top:0;overflow:visible;pointer-events:none;width:1px;height:1px';
  el.appendChild(svg);

  let draw: DrawPathHandle | null = null;
  let progress = 0;

  const build = () => {
    draw?.dispose();
    svg.replaceChildren();
    const rand = createRandom(options.seed ?? 1);
    const box = el.getBoundingClientRect();
    const lines = Array.from(el.getClientRects());
    const amp = 1 + rough * 4;
    const ds: string[] = [];
    const rel = (r: DOMRect) => ({
      l: r.left - box.left,
      t: r.top - box.top,
      r: r.right - box.left,
      b: r.bottom - box.top,
    });
    const b = rel(box);
    if (type === 'underline' || type === 'strike') {
      for (const lr of lines.length ? lines : [box]) {
        const r = rel(lr);
        const y = type === 'underline' ? r.b + pad * 0.4 : (r.t + r.b) / 2 + (r.b - r.t) * 0.06;
        ds.push(roughLine(rand, r.l - pad * 0.3, y, r.r + pad * 0.3, y - amp * 0.4, amp));
        if (doublePass)
          ds.push(roughLine(rand, r.l, y + width * 1.6, r.r - pad, y + width * 0.6, amp));
      }
    } else if (type === 'circle') {
      ds.push(
        roughEllipse(
          rand,
          (b.l + b.r) / 2,
          (b.t + b.b) / 2,
          (b.r - b.l) / 2 + pad * 1.6,
          (b.b - b.t) / 2 + pad,
          amp,
        ),
      );
    } else if (type === 'box') {
      const [l, t, r, bt] = [b.l - pad, b.t - pad, b.r + pad, b.b + pad];
      ds.push(
        roughLine(rand, l, t, r, t, amp) +
          roughLine(rand, r, t, r, bt, amp).replace(/^M/, 'L') +
          roughLine(rand, r, bt, l, bt, amp).replace(/^M/, 'L') +
          roughLine(rand, l, bt, l, t, amp).replace(/^M/, 'L'),
      );
    } else if (type === 'cross') {
      ds.push(roughLine(rand, b.l - pad, b.t, b.r + pad, b.b, amp));
      ds.push(roughLine(rand, b.r + pad, b.t, b.l - pad, b.b, amp));
    } else {
      // bracket: a left-hand margin mark, like an editor flagging a passage.
      const x = b.l - pad * 2;
      ds.push(
        roughLine(rand, x + pad, b.t, x, b.t + pad, amp * 0.5) +
          roughLine(rand, x, b.t + pad, x, b.b - pad, amp * 0.6).replace(/^M/, 'L') +
          roughLine(rand, x, b.b - pad, x + pad, b.b, amp * 0.5).replace(/^M/, 'L'),
      );
    }
    const paths = ds.map((d) => {
      const p = document.createElementNS(ns, 'path');
      p.setAttribute('d', d);
      p.setAttribute('fill', 'none');
      // Inline style (not the attribute) so CSS variables like `var(--accent)` resolve.
      p.style.stroke = options.color ?? 'currentColor';
      p.setAttribute('stroke-width', String(width));
      p.setAttribute('stroke-linecap', 'round');
      p.setAttribute('stroke-linejoin', 'round');
      svg.appendChild(p);
      return p;
    });
    draw = drawPath(paths);
    draw.seek(progress);
  };
  build();

  const play = () => {
    if (!draw) return Promise.resolve();
    return draw
      .play({
        duration: options.duration ?? 0.8,
        ease: options.ease ?? 'cubic-bezier(0.65, 0, 0.35, 1)',
      })
      .then(() => {
        progress = 1;
      });
  };

  if ((options.trigger ?? 'inview') === 'inview') {
    scope.add(
      inView(
        el,
        () => {
          window.setTimeout(
            () => {
              if (!scope.disposed) void play();
            },
            (options.delay ?? 0.15) * 1000,
          );
        },
        { amount: 0.6 },
      ),
    );
  }

  if (typeof ResizeObserver !== 'undefined') {
    let first = true;
    const ro = new ResizeObserver(() => {
      if (first) {
        first = false;
        return;
      }
      build();
    });
    ro.observe(el);
    scope.add(() => ro.disconnect());
  }

  scope.add(() => {
    draw?.dispose();
    svg.remove();
    el.style.position = prevPosition;
  });

  return {
    play,
    refresh: build,
    seek(p: number) {
      progress = p;
      draw?.seek(p);
    },
    get duration() {
      return options.duration ?? 0.8;
    },
    dispose: () => scope.dispose(),
  };
}
