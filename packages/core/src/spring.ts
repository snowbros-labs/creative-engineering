import type { EaseFn } from './ease.js';

export interface SpringConfig {
  /** Spring stiffness (k). Higher = faster. Default 170. */
  stiffness?: number;
  /** Damping coefficient (c). Higher = less oscillation. Default 26. */
  damping?: number;
  /** Mass (m). Default 1. */
  mass?: number;
  /** Initial velocity in units of "distance per second" relative to a 0→1 move. */
  velocity?: number;
}

/** Spring presets tuned for UI. `gentle`/`smooth` never overshoot visibly. */
export const springs = {
  smooth: { stiffness: 170, damping: 26, mass: 1 },
  gentle: { stiffness: 120, damping: 20, mass: 1 },
  snappy: { stiffness: 400, damping: 34, mass: 1 },
  bouncy: { stiffness: 260, damping: 14, mass: 1 },
  slow: { stiffness: 60, damping: 15, mass: 1 },
} satisfies Record<string, Required<Omit<SpringConfig, 'velocity'>>>;

export type SpringName = keyof typeof springs;

/**
 * Closed-form damped harmonic oscillator. Returns position (0 → 1) at time `t` seconds.
 * Analytic rather than integrated, so it can be sampled at any time — which is what
 * makes springs seekable inside timelines and scroll scrubs.
 */
export function springPosition(config: SpringConfig, t: number): number {
  const k = config.stiffness ?? 170;
  const c = config.damping ?? 26;
  const m = config.mass ?? 1;
  const v0 = -(config.velocity ?? 0);
  const w0 = Math.sqrt(k / m);
  const zeta = c / (2 * Math.sqrt(k * m));
  const x0 = 1; // displacement from target at t=0

  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    const env = Math.exp(-zeta * w0 * t);
    const x = env * (x0 * Math.cos(wd * t) + ((zeta * w0 * x0 + v0) / wd) * Math.sin(wd * t));
    return 1 - x;
  }
  if (zeta === 1) {
    const x = Math.exp(-w0 * t) * (x0 + (w0 * x0 + v0) * t);
    return 1 - x;
  }
  const s = w0 * Math.sqrt(zeta * zeta - 1);
  const env = Math.exp(-zeta * w0 * t);
  const x = env * (x0 * Math.cosh(s * t) + ((zeta * w0 * x0 + v0) / s) * Math.sinh(s * t));
  return 1 - x;
}

/**
 * Time (seconds) until the spring stays within `restDelta` of its target.
 * Sampled at 1/120 s and capped at 10 s.
 */
export function springDuration(config: SpringConfig, restDelta = 0.001): number {
  const step = 1 / 120;
  let lastOutside = 0;
  for (let t = 0; t <= 10; t += step) {
    if (Math.abs(1 - springPosition(config, t)) > restDelta) lastOutside = t;
    else if (t - lastOutside > 0.1) break;
  }
  return Math.min(10, lastOutside + step);
}

/**
 * Convert a spring into a normalised easing function plus its natural duration,
 * so it can drive any time-based tween or be exported with `toCssLinear()`.
 */
export function springEase(config: SpringConfig | SpringName = 'smooth'): {
  ease: EaseFn;
  duration: number;
} {
  const cfg = typeof config === 'string' ? springs[config] : config;
  const duration = springDuration(cfg);
  return {
    duration,
    ease: (p) => (p <= 0 ? 0 : p >= 1 ? 1 : springPosition(cfg, p * duration)),
  };
}

/**
 * Stateful spring for interactive values (pointer following, magnetic UI, drag release).
 * Integrates with semi-implicit Euler using sub-steps, so it keeps the current velocity
 * when the target changes mid-flight — retargeting feels physical, never restarts.
 */
export interface SpringValue {
  readonly value: number;
  readonly velocity: number;
  readonly target: number;
  /** True when within rest thresholds of the target. */
  readonly settled: boolean;
  set(target: number): void;
  /** Jump instantly to a value (no animation), e.g. for reduced motion. */
  jump(value: number): void;
  /**
   * Add velocity (units/second) without moving the value — a flick, a pluck, a bump. Motion
   * stays continuous even if the spring is already moving.
   */
  impulse(velocity: number): void;
  /** Advance by `dt` seconds. Returns the new value. */
  step(dt: number): number;
}

export function createSpringValue(
  initial = 0,
  config: SpringConfig | SpringName = 'smooth',
  restDelta = 0.0005,
): SpringValue {
  const cfg = typeof config === 'string' ? springs[config] : config;
  const k = cfg.stiffness ?? 170;
  const c = cfg.damping ?? 26;
  const m = cfg.mass ?? 1;
  let value = initial;
  let velocity = 0;
  let target = initial;

  return {
    get value() {
      return value;
    },
    get velocity() {
      return velocity;
    },
    get target() {
      return target;
    },
    get settled() {
      return Math.abs(target - value) < restDelta && Math.abs(velocity) < restDelta;
    },
    set(next) {
      target = next;
    },
    jump(next) {
      value = next;
      target = next;
      velocity = 0;
    },
    impulse(v) {
      velocity += v;
    },
    step(dt) {
      const clamped = Math.min(dt, 1 / 15);
      const steps = Math.max(1, Math.ceil(clamped / (1 / 240)));
      const h = clamped / steps;
      for (let i = 0; i < steps; i++) {
        const force = -k * (value - target) - c * velocity;
        velocity += (force / m) * h;
        value += velocity * h;
      }
      if (Math.abs(target - value) < restDelta && Math.abs(velocity) < restDelta) {
        value = target;
        velocity = 0;
      }
      return value;
    },
  };
}
