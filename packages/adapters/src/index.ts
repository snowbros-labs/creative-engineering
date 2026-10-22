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
  type ProgressSource,
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
  /** Lenis ≥ 1.1: falsy once the smoothed scroll has settled. Lets the loop sleep. */
  isScrolling?: unknown;
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
export function smoothScroll<L extends LenisLike>(
  options: SmoothScrollOptions<L>,
): PatternHandle & { readonly instance: L | null; wake(): void } {
  const scope = createScope();
  let instance: L | null = null;
  let off: (() => void) | null = null;
  const touch =
    typeof matchMedia === 'function' &&
    matchMedia('(pointer: coarse)').matches &&
    (options.skipOnTouch ?? true);
  // Drive Lenis from the shared ticker only while it has work: input wakes the loop, and it
  // sleeps once Lenis reports it has settled. (Lenis's own autoRaf, or a permanent ticker
  // subscription, would keep a frame loop running on an idle page forever.) Instances without
  // `isScrolling` fall back to always running.
  let lastWake = 0;
  const tick = (f: { time: number }) => {
    if (!instance) return;
    instance.raf(f.time);
    if ('isScrolling' in instance && !instance.isScrolling && f.time - lastWake > 250) {
      off?.();
      off = null;
    }
  };
  const wake = () => {
    lastWake = typeof performance !== 'undefined' ? performance.now() : 0;
    if (instance && !off) off = ticker.add(tick, Priority.input);
  };
  const WAKE_EVENTS = ['wheel', 'keydown', 'pointerdown', 'touchstart', 'click', 'scroll'] as const;
  const sync = () => {
    const allowed = motionPreference.get() === 'full' && !touch;
    if (allowed && !instance) {
      instance = options.create();
      wake();
    } else if (!allowed && instance) {
      off?.();
      off = null;
      instance.destroy();
      instance = null;
    }
  };
  if (typeof window !== 'undefined')
    for (const type of WAKE_EVENTS)
      scope.listen(window, type, wake, { passive: true, capture: true });
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
    wake,
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

// ---------------------------------------------------------------- Rive

/** The subset of a Rive state-machine input we use (`stateMachineInputs(name)` entries). */
export interface RiveInputLike {
  value: number | boolean;
}

export interface RiveInputOptions {
  /** Number inputs: the 0..1 progress maps onto this range. Default [0, 100] (Rive's common scale). */
  range?: [number, number];
  /** Boolean inputs: true once progress reaches this value. Default 0.5. */
  threshold?: number;
}

/**
 * Drive a Rive state-machine input from any SNOWBROS progress source — scroll (`scrollProgress`,
 * `pin().progress`), a spring, a slider. Rive then owns the artwork's states and blending; SNOWBROS
 * owns the single scroll model. Number inputs are mapped onto `range`; boolean inputs flip at
 * `threshold`. Writes only when the value changes. The Rive runtime is not bundled.
 *
 * ```ts
 * const input = riveInstance.stateMachineInputs('Main').find((i) => i.name === 'progress')!;
 * driveRiveInput(input, scrollProgress(section));
 * ```
 */
export function driveRiveInput(
  input: RiveInputLike,
  source: ProgressSource,
  options: RiveInputOptions = {},
): PatternHandle {
  const [lo, hi] = options.range ?? [0, 100];
  const threshold = options.threshold ?? 0.5;
  const apply = (p: number) => {
    const next = typeof input.value === 'boolean' ? p >= threshold : lo + (hi - lo) * p;
    if (input.value !== next) input.value = next;
  };
  apply(source.get());
  const off = source.subscribe(apply);
  return { dispose: off };
}

// ---------------------------------------------------------------- Physics (Rapier and friends)

/** The subset of a physics world we use (Rapier's `World`, or anything with `step()`). */
export interface PhysicsWorldLike {
  step(): void;
  /** Rapier exposes the fixed step as `timestep` (seconds). */
  timestep?: number;
}

export interface StepPhysicsOptions {
  /** Fixed simulation rate. Default 60 Hz (sets `world.timestep` when present). */
  hz?: number;
  /** Max sub-steps per frame, so a slow frame can't spiral. Default 4. */
  maxSteps?: number;
  /** After each frame's steps; `alpha` (0..1) is the leftover for render interpolation. */
  onStep?: (alpha: number) => void;
  /**
   * Stop stepping when this returns true (e.g. every body asleep) — the loop resubscribes on
   * `wake()`. Without it the world steps every frame while the handle lives.
   */
  isAsleep?: () => boolean;
}

/**
 * Step a physics world at a fixed rate from the shared SNOWBROS ticker (one rAF loop for physics,
 * motion and rendering). Under reduced motion the simulation keeps running (it is state, not
 * decoration) — decide per project whether to settle bodies instantly instead.
 *
 * ```ts
 * const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
 * const physics = stepPhysics(world, { onStep: () => stage.invalidate(), isAsleep: () => allSleeping(world) });
 * canvas.addEventListener('pointerdown', () => { kick(); physics.wake(); });
 * ```
 */
export function stepPhysics(
  world: PhysicsWorldLike,
  options: StepPhysicsOptions = {},
): PatternHandle & { wake(): void } {
  const dt = 1 / (options.hz ?? 60);
  const maxSteps = options.maxSteps ?? 4;
  if ('timestep' in world) world.timestep = dt;
  let acc = 0;
  let off: (() => void) | null = null;
  const frame = (f: { delta: number }) => {
    acc = Math.min(acc + f.delta, dt * maxSteps);
    while (acc >= dt) {
      world.step();
      acc -= dt;
    }
    options.onStep?.(acc / dt);
    if (options.isAsleep?.()) {
      off?.();
      off = null;
    }
  };
  const wake = () => {
    if (!off) off = ticker.add(frame, Priority.update);
  };
  wake();
  return {
    wake,
    dispose() {
      off?.();
      off = null;
    },
  };
}

// ---------------------------------------------------------------- Audio (Howler.js and friends)

/** The subset of a Howler `Howl` (or any player) we use. */
export interface SoundLike {
  play(sprite?: string): unknown;
  stop?(): unknown;
  volume?(v: number): unknown;
}

export interface SoundCuesOptions {
  /** localStorage key remembering the visitor's choice. Default `sb-sound`. */
  storageKey?: string;
  /** Initial state when nothing is stored. Default false — sound is always opt-in. */
  defaultOn?: boolean;
  /** Minimum ms between two plays of the same cue (stops machine-gun clicks). Default 60. */
  throttle?: number;
}

export interface SoundCues<K extends string> extends PatternHandle {
  readonly enabled: boolean;
  setEnabled(on: boolean): void;
  /** Plays only when enabled and the tab is visible. */
  play(cue: K): void;
  subscribe(listener: (on: boolean) => void): () => void;
}

/**
 * Opt-in sound cues: a remembered on/off switch around Howler (or any player). Sound never plays
 * until the visitor turns it on — pair it with a visible toggle, like the haptics toggle.
 *
 * ```ts
 * const sfx = soundCues({ pluck: new Howl({ src: ['/pluck.webm', '/pluck.mp3'] }) });
 * toggle.onclick = () => sfx.setEnabled(!sfx.enabled);
 * onPluck(() => sfx.play('pluck'));
 * ```
 */
export function soundCues<K extends string>(
  sounds: Record<K, SoundLike>,
  options: SoundCuesOptions = {},
): SoundCues<K> {
  const key = options.storageKey ?? 'sb-sound';
  const throttle = options.throttle ?? 60;
  const last = new Map<K, number>();
  const listeners = new Set<(on: boolean) => void>();
  let on = options.defaultOn ?? false;
  try {
    const stored = globalThis.localStorage?.getItem(key);
    if (stored === 'on' || stored === 'off') on = stored === 'on';
  } catch {
    // storage blocked: keep the default
  }
  return {
    get enabled() {
      return on;
    },
    setEnabled(next) {
      on = next;
      try {
        globalThis.localStorage?.setItem(key, next ? 'on' : 'off');
      } catch {
        // ignore
      }
      if (!next) for (const s of Object.values<SoundLike>(sounds)) s.stop?.();
      for (const l of listeners) l(on);
    },
    play(cue) {
      if (!on) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (now - (last.get(cue) ?? -Infinity) < throttle) return;
      last.set(cue, now);
      sounds[cue]?.play();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      listeners.clear();
      for (const s of Object.values<SoundLike>(sounds)) s.stop?.();
    },
  };
}
