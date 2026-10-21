export type EaseFn = (t: number) => number;

/**
 * Easing accepted everywhere in SNOWBROS: a function, a named preset,
 * or a CSS-style `cubic-bezier(x1, y1, x2, y2)` string.
 */
export type Ease = EaseFn | EaseName | `cubic-bezier(${string})`;

const NEWTON_ITERATIONS = 8;
const NEWTON_EPSILON = 1e-6;
const SUBDIVISION_ITERATIONS = 12;

/**
 * Build an easing function equivalent to CSS `cubic-bezier(x1, y1, x2, y2)`.
 * Solves x(t) = progress with Newton–Raphson and falls back to bisection.
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): EaseFn {
  if (x1 === y1 && x2 === y2) return linear;
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  const solveT = (x: number): number => {
    let t = x;
    for (let i = 0; i < NEWTON_ITERATIONS; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < NEWTON_EPSILON) return t;
      const d = slopeX(t);
      if (Math.abs(d) < NEWTON_EPSILON) break;
      t -= err / d;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < SUBDIVISION_ITERATIONS; i++) {
      const v = sampleX(t);
      if (Math.abs(v - x) < NEWTON_EPSILON) return t;
      if (v < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return t;
  };

  return (p: number) => (p <= 0 ? 0 : p >= 1 ? 1 : sampleY(solveT(p)));
}

export const linear: EaseFn = (t) => t;

const pow =
  (n: number): EaseFn =>
  (t) =>
    t ** n;
const out =
  (fn: EaseFn): EaseFn =>
  (t) =>
    1 - fn(1 - t);
const inOut =
  (fn: EaseFn): EaseFn =>
  (t) =>
    t < 0.5 ? fn(t * 2) / 2 : 1 - fn((1 - t) * 2) / 2;

const expoIn: EaseFn = (t) => (t === 0 ? 0 : 2 ** (10 * t - 10));
const circIn: EaseFn = (t) => 1 - Math.sqrt(1 - t * t);
const backIn: EaseFn = (t) => 2.70158 * t * t * t - 1.70158 * t * t;

/** Named easing presets. `*Out` curves suit entrances, `*In` exits, `*InOut` moves. */
export const eases = {
  linear,
  inQuad: pow(2),
  outQuad: out(pow(2)),
  inOutQuad: inOut(pow(2)),
  inCubic: pow(3),
  outCubic: out(pow(3)),
  inOutCubic: inOut(pow(3)),
  inQuart: pow(4),
  outQuart: out(pow(4)),
  inOutQuart: inOut(pow(4)),
  inQuint: pow(5),
  outQuint: out(pow(5)),
  inOutQuint: inOut(pow(5)),
  inExpo: expoIn,
  outExpo: out(expoIn),
  inOutExpo: inOut(expoIn),
  inCirc: circIn,
  outCirc: out(circIn),
  inOutCirc: inOut(circIn),
  inBack: backIn,
  outBack: out(backIn),
  inOutBack: inOut(backIn),
  /** CSS `ease`. */
  css: cubicBezier(0.25, 0.1, 0.25, 1),
  /** A long, decisive deceleration for editorial reveals. */
  editorial: cubicBezier(0.16, 1, 0.3, 1),
  /** Gentle in-and-out used for camera moves and large spatial transitions. */
  cinematic: cubicBezier(0.65, 0, 0.35, 1),
} satisfies Record<string, EaseFn>;

export type EaseName = keyof typeof eases;

const bezierCache = new Map<string, EaseFn>();

/** Resolve any {@link Ease} into a function. Unknown names fall back to `outCubic`. */
export function resolveEase(ease: Ease | undefined, fallback: EaseFn = eases.outCubic): EaseFn {
  if (!ease) return fallback;
  if (typeof ease === 'function') return ease;
  if (ease in eases) return eases[ease as EaseName];
  const cached = bezierCache.get(ease);
  if (cached) return cached;
  const match = /^cubic-bezier\(\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)$/.exec(ease);
  if (match) {
    const [x1, y1, x2, y2] = match.slice(1).map(Number) as [number, number, number, number];
    if ([x1, y1, x2, y2].every(Number.isFinite)) {
      const fn = cubicBezier(x1, y1, x2, y2);
      bezierCache.set(ease, fn);
      return fn;
    }
  }
  return fallback;
}

/**
 * Sample an easing into a CSS `linear()` function so JS-defined curves (springs, custom
 * functions) can be handed to CSS transitions, WAAPI or scroll-driven animations.
 */
export function toCssLinear(ease: EaseFn, samples = 24): string {
  const points: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const v = ease(i / samples);
    points.push(String(Math.round(v * 10000) / 10000));
  }
  return `linear(${points.join(', ')})`;
}
