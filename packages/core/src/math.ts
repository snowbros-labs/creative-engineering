/** Clamp `value` into the inclusive range [min, max]. */
export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(Math.max(value, min), max);
}

/** Linear interpolation between `a` and `b`. `t` is not clamped. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Inverse of {@link lerp}: where `value` sits between `a` and `b` (unclamped). */
export function invLerp(a: number, b: number, value: number): number {
  return a === b ? 0 : (value - a) / (b - a);
}

/** Re-map `value` from [inMin, inMax] to [outMin, outMax]. Clamped by default. */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
  clamped = true,
): number {
  const t = invLerp(inMin, inMax, value);
  return lerp(outMin, outMax, clamped ? clamp(t) : t);
}

/**
 * Frame-rate independent exponential smoothing.
 * `lambda` is the decay rate per second (higher = snappier); `dt` is in seconds.
 * Unlike `lerp(a, b, 0.1)` per frame, this behaves identically at 30, 60 or 144 Hz.
 */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

/** Wrap `value` into [min, max). Useful for infinite marquees and carousels. */
export function wrap(value: number, min: number, max: number): number {
  const range = max - min;
  if (range === 0) return min;
  return ((((value - min) % range) + range) % range) + min;
}

/** Round to a fixed number of decimals without string conversion. */
export function round(value: number, decimals = 3): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/**
 * Split a normalised progress into a sub-range. Returns 0 before `start`, 1 after `end`,
 * and a linear 0..1 ramp in between. The building block for coordinating several
 * elements on one scroll progress without separate scroll listeners.
 */
export function segment(progress: number, start: number, end: number): number {
  return clamp(invLerp(start, end, progress));
}
