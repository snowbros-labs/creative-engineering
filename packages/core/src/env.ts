import { createSignal, type ReadonlySignal } from './signal.js';

export const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

/**
 * How much motion the user wants.
 * - `full`: no preference expressed.
 * - `reduced`: OS/browser `prefers-reduced-motion: reduce`, or an in-app override.
 */
export type MotionPreference = 'full' | 'reduced';

const mediaReduced =
  isBrowser && typeof matchMedia === 'function'
    ? matchMedia('(prefers-reduced-motion: reduce)')
    : null;

let override: MotionPreference | null = null;
const preference = createSignal<MotionPreference>(mediaReduced?.matches ? 'reduced' : 'full');

const recompute = () => {
  preference.set(override ?? (mediaReduced?.matches ? 'reduced' : 'full'));
};
mediaReduced?.addEventListener?.('change', recompute);

/** Reactive motion preference. Subscribe to react when the user flips the OS setting. */
export const motionPreference: ReadonlySignal<MotionPreference> = preference;

/** Current snapshot: true when motion should be reduced. */
export function prefersReducedMotion(): boolean {
  return preference.get() === 'reduced';
}

/**
 * Force a preference for this page (e.g. an in-app "reduce motion" toggle), or pass `null`
 * to follow the system setting again. In-app toggles should only ever add restraint;
 * never use this to override a system `reduce` to `full` without the user's explicit action.
 */
export function setMotionPreference(value: MotionPreference | null): void {
  override = value;
  recompute();
}

export interface Capabilities {
  webgl: boolean;
  webgl2: boolean;
  /** `navigator.gpu` exists. Adapter acquisition can still fail — see `requestWebGPU`. */
  webgpu: boolean;
  /** CSS `animation-timeline: scroll()` support. */
  scrollTimeline: boolean;
  /** Same-document View Transitions (`document.startViewTransition`). */
  viewTransitions: boolean;
  /** Primary input is coarse (touch). */
  coarsePointer: boolean;
  /** Device supports hover on its primary input. */
  hover: boolean;
  /** User or network requested reduced data usage. */
  saveData: boolean;
}

let cachedCaps: Capabilities | null = null;

function probeWebGL(version: 1 | 2): boolean {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext(version === 2 ? 'webgl2' : 'webgl');
    const ok = !!ctx;
    // Release the probe context immediately; browsers cap live contexts.
    (ctx as WebGLRenderingContext | null)?.getExtension('WEBGL_lose_context')?.loseContext();
    return ok;
  } catch {
    return false;
  }
}

/** Detect rendering and interaction capabilities. Cached after the first call. */
export function capabilities(): Capabilities {
  if (cachedCaps) return cachedCaps;
  if (!isBrowser) {
    return {
      webgl: false,
      webgl2: false,
      webgpu: false,
      scrollTimeline: false,
      viewTransitions: false,
      coarsePointer: false,
      hover: false,
      saveData: false,
    };
  }
  const mq = (q: string) => (typeof matchMedia === 'function' ? matchMedia(q).matches : false);
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; gpu?: unknown };
  const webgl2 = probeWebGL(2);
  cachedCaps = {
    webgl2,
    webgl: webgl2 || probeWebGL(1),
    webgpu: !!nav.gpu,
    scrollTimeline: typeof CSS !== 'undefined' && !!CSS.supports?.('animation-timeline: scroll()'),
    viewTransitions: 'startViewTransition' in document,
    coarsePointer: mq('(pointer: coarse)'),
    hover: mq('(hover: hover)'),
    saveData: !!nav.connection?.saveData || mq('(prefers-reduced-data: reduce)'),
  };
  return cachedCaps;
}

/**
 * Coarse device tier used to choose a quality level. Heuristic only — always pair with a
 * runtime frame-time check (see `createQualityGovernor` in @snowbros/scene) for 3D work.
 *  - `low`: save-data, ≤2 cores or ≤2 GB memory, or no WebGL.
 *  - `mid`: ≤4 cores or ≤4 GB memory, or a coarse pointer.
 *  - `high`: everything else.
 */
export type DeviceTier = 'low' | 'mid' | 'high';

export function deviceTier(): DeviceTier {
  if (!isBrowser) return 'mid';
  const caps = capabilities();
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  if (caps.saveData || !caps.webgl || cores <= 2 || memory <= 2) return 'low';
  if (cores <= 4 || memory <= 4 || caps.coarsePointer) return 'mid';
  return 'high';
}

/** For tests: forget cached capability probes. */
export function resetCapabilities(): void {
  cachedCaps = null;
}
