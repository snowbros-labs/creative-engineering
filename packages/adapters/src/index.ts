/**
 * Interop adapters. They describe the third-party APIs structurally, so this package never
 * imports, bundles or redistributes Lenis, GSAP or Motion — you install the library you already
 * use and pass it in. (GSAP ships under its own non-OSI "Standard no-charge" license; that license
 * applies to your app when you install it, not to SNOWBROS.)
 */
import {
  createScope,
  motionPreference,
  type PatternHandle,
  Priority,
  type Seekable,
  ticker,
} from '@snowbros/core';

// ---------------------------------------------------------------- Lenis

/** The subset of a Lenis instance we use. */
export interface LenisLike {
  raf(time: number): void;
  destroy(): void;
  stop?(): void;
  start?(): void;
}

export interface SmoothScrollOptions<L extends LenisLike> {
  /** Factory, e.g. `() => new Lenis({ lerp: 0.12 })`. Only called when motion is allowed. */
  create: () => L;
  /** Disable on touch-primary devices (native momentum is already good). Default true. */
  skipOnTouch?: boolean;
}

/**
 * Optional smooth scrolling with Lenis, driven by the shared SNOWBROS ticker (one rAF loop).
 * Lenis keeps the native scroll position, so `scrollProgress`, `pin` and anchors keep working.
 * Torn down automatically when the user switches to reduced motion.
 */
export function smoothScroll<L extends LenisLike>(options: SmoothScrollOptions<L>): PatternHandle & { readonly instance: L | null } {
  const scope = createScope();
  let instance: L | null = null;
  let off: (() => void) | null = null;
  const touch =
    typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches && (options.skipOnTouch ?? true);
  const sync = () => {
    const allowed = motionPreference.get() === 'full' && !touch;
    if (allowed && !instance) {
      instance = options.create();
      const current = instance;
      off = ticker.add((f) => current.raf(f.time), Priority.input);
    } else if (!allowed && instance) {
      off?.();
      instance.destroy();
      instance = null;
    }
  };
  sync();
  scope.add(motionPreference.subscribe(sync));
  scope.add(() => {
    off?.();
    instance?.destroy();
    instance = null;
  });
  return {
    get instance() {
      return instance;
    },
    dispose: () => scope.dispose(),
  };
}

// ---------------------------------------------------------------- GSAP

export interface GsapTickerLike {
  add(cb: (time: number, deltaTime: number, frame: number) => void): unknown;
  remove(cb: (time: number, deltaTime: number, frame: number) => void): unknown;
  lagSmoothing?(threshold: number, adjusted?: number): void;
}

/**
 * Run the SNOWBROS ticker from GSAP's ticker so the page has exactly one animation loop
 * when a project already uses GSAP.
 */
export function shareGsapTicker(gsapTicker: GsapTickerLike): PatternHandle {
  const restore = ticker.useExternalClock();
  const cb = (time: number) => ticker.tick(time * 1000);
  gsapTicker.add(cb);
  return {
    dispose() {
      gsapTicker.remove(cb);
      restore();
    },
  };
}

/** The subset of a GSAP Tween/Timeline we use. */
export interface GsapAnimationLike {
  progress(value: number): unknown;
  duration(): number;
  pause(): unknown;
}

/**
 * Wrap a GSAP tween/timeline as a SNOWBROS `Seekable`, so `scrub(fromGsap(tl), pin.progress)`
 * drives it from a sticky pin without ScrollTrigger.
 */
export function fromGsap(animation: GsapAnimationLike): Seekable & { pause(): void } {
  return {
    get duration() {
      return animation.duration();
    },
    seek: (p) => {
      animation.progress(p);
    },
    pause: () => {
      animation.pause();
    },
  };
}

// ---------------------------------------------------------------- Motion (motion.dev)

/** The subset of a Motion `AnimationPlaybackControls` we use. */
export interface MotionAnimationLike {
  time: number;
  readonly duration: number;
  pause(): void;
}

/** Wrap a Motion animation (`animate(...)` result) as a SNOWBROS `Seekable`. */
export function fromMotion(animation: MotionAnimationLike): Seekable & { pause(): void } {
  return {
    get duration() {
      return animation.duration;
    },
    seek: (p) => {
      animation.time = p * animation.duration;
    },
    pause: () => animation.pause(),
  };
}
