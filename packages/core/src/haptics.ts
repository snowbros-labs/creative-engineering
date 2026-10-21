import { isBrowser, prefersReducedMotion } from './env.js';
import { createSignal, type ReadonlySignal } from './signal.js';

/**
 * Haptic feedback on top of the Web Vibration API.
 *
 * Haptics are an enhancement, never a channel of their own: every call site must also give
 * visual (and, where relevant, textual) feedback. Vibration only works on some devices and
 * browsers (notably Android Chrome; not iOS Safari), only after a user gesture, and only in a
 * visible tab — so `haptic()` returns whether it actually asked the device to vibrate.
 */

/** Named patterns, in milliseconds (`[on, off, on, …]`). Short and sparse by design. */
export const hapticPatterns = {
  /** Detents, steps, crossing a threshold. */
  tick: [6],
  /** Selecting an option, toggling. */
  select: [10],
  /** A press that commits (button down on a physical-feeling control). */
  press: [16],
  /** Completion of a deliberate action. */
  success: [10, 50, 22],
  /** Something needs attention. */
  warning: [24, 40, 24],
  /** Validation failed. */
  error: [32, 30, 32, 30, 48],
} satisfies Record<string, number[]>;

export type HapticName = keyof typeof hapticPatterns;

export interface HapticOptions {
  /** Minimum ms between two calls of the same pattern (prevents buzzing). Default 45. */
  throttle?: number;
  /** Vibrate even when the user prefers reduced motion. Default false. */
  ignoreReducedMotion?: boolean;
}

const enabled = createSignal(true);
/** App-level switch (e.g. a "Haptics" setting). Defaults to on. */
export const hapticsEnabled: ReadonlySignal<boolean> = enabled;

/** Turn haptics on/off for this page (persisting the choice is up to the app). */
export function setHapticsEnabled(value: boolean): void {
  enabled.set(value);
}

type VibrateNavigator = Navigator & {
  vibrate?: (pattern: number | number[]) => boolean;
  userActivation?: { hasBeenActive: boolean };
};

/** True when the browser exposes the Vibration API. It may still be a no-op on the device. */
export function canVibrate(): boolean {
  return (
    isBrowser &&
    typeof navigator !== 'undefined' &&
    typeof (navigator as VibrateNavigator).vibrate === 'function'
  );
}

const lastCall = new Map<string, number>();

/**
 * Request a short vibration. Returns `true` only if the request was handed to the browser.
 * Silently does nothing when unsupported, disabled, hidden, before any user gesture, or (by
 * default) when reduced motion is preferred.
 */
export function haptic(
  pattern: HapticName | number | number[],
  options: HapticOptions = {},
): boolean {
  if (!enabled.get() || !canVibrate()) return false;
  if (!options.ignoreReducedMotion && prefersReducedMotion()) return false;
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return false;
  const nav = navigator as VibrateNavigator;
  // Browsers ignore vibration without sticky user activation; skip the call (and its console noise).
  if (nav.userActivation && !nav.userActivation.hasBeenActive) return false;
  const value = typeof pattern === 'string' ? hapticPatterns[pattern] : pattern;
  const key = typeof pattern === 'string' ? pattern : JSON.stringify(value);
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const last = lastCall.get(key);
  if (last !== undefined && now - last < (options.throttle ?? 45)) return false;
  lastCall.set(key, now);
  try {
    return nav.vibrate!(value) !== false;
  } catch {
    return false;
  }
}
