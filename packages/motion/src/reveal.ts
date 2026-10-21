import {
  createScope,
  type Ease,
  type PatternHandle,
  type ReducedMotionPolicy,
} from '@snowbros/core';
import { type InViewOptions, inView } from './observe.js';
import { type SplitResult, splitText } from './split.js';
import { resolveTargets, type TargetInput } from './targets.js';
import { animate, type Props, type Timeline } from './timeline.js';

/** Reveal presets. Each is a from→to pair designed to read well at small and large sizes. */
export const revealPresets = {
  /** Lines rise out of an overflow mask. Requires `mask: true` splitting (done automatically). */
  rise: { y: ['110%', '0%'] },
  /** Short lift with fade — the safe default for UI and body copy. */
  'fade-up': { y: [16, 0], opacity: [0, 1] },
  fade: { opacity: [0, 1] },
  /** Soft focus pull. Use sparingly; `filter` is more expensive than transforms. */
  blur: { opacity: [0, 1], filter: ['blur(10px)', 'blur(0px)'] },
  /** Wipe upwards via clip-path. */
  wipe: { clipPath: ['inset(100% 0% 0% 0%)', 'inset(0% 0% 0% 0%)'] },
  /** Slight scale settle for images and cards. */
  settle: { scale: [1.06, 1], opacity: [0, 1] },
} satisfies Record<string, Props>;

export type RevealPreset = keyof typeof revealPresets;

export interface RevealOptions {
  preset?: RevealPreset | Props;
  /** `inview` (default), `load`, or `manual` (call `.play()` yourself). */
  trigger?: 'inview' | 'load' | 'manual';
  duration?: number;
  stagger?: number;
  delay?: number;
  ease?: Ease;
  reducedMotion?: ReducedMotionPolicy;
  inView?: InViewOptions;
}

export interface RevealHandle extends PatternHandle {
  play(): Promise<void>;
  readonly timeline: Timeline;
}

function start(
  units: object[],
  props: Props,
  options: RevealOptions,
  defaults: { duration: number; stagger: number; ease: Ease },
  trigger: Element[],
  onDispose: () => void,
): RevealHandle {
  const scope = createScope();
  const tl = animate(units, props, {
    duration: options.duration ?? defaults.duration,
    stagger: options.stagger ?? defaults.stagger,
    delay: options.delay ?? 0,
    ease: options.ease ?? defaults.ease,
    reducedMotion: options.reducedMotion ?? 'fade',
    autoplay: false,
  });
  scope.add(() => tl.kill());
  scope.add(onDispose);
  const mode = options.trigger ?? 'inview';
  if (mode === 'load') tl.play();
  else if (mode === 'inview') {
    let played = false;
    scope.add(
      inView(
        trigger,
        () => {
          if (played) return;
          played = true;
          tl.play();
        },
        options.inView,
      ),
    );
  }
  return {
    timeline: tl,
    play: () => tl.play().finished,
    dispose: () => scope.dispose(),
  };
}

/**
 * Reveal headings or paragraphs line by line, word by word or char by char.
 * Text stays readable by assistive tech (see `splitText`). Default: masked line rise.
 *
 * ```ts
 * revealText(document.querySelector('h1')!, { by: 'lines', preset: 'rise' });
 * ```
 */
export function revealText(
  el: HTMLElement,
  options: RevealOptions & { by?: 'lines' | 'words' | 'chars' } = {},
): RevealHandle & { split: SplitResult } {
  const by = options.by ?? 'lines';
  const presetName = options.preset ?? (by === 'lines' ? 'rise' : 'fade-up');
  const props = typeof presetName === 'string' ? revealPresets[presetName] : presetName;
  const mask = presetName === 'rise';
  const split = splitText(el, {
    by: by === 'lines' ? ['lines', 'words'] : by === 'words' ? ['words'] : ['words', 'chars'],
    mask,
  });
  let units: HTMLElement[] =
    by === 'lines' ? split.lines : by === 'words' ? split.words : split.chars;
  if (units.length === 0) units = split.words; // nested markup prevented line wrapping
  const handle = start(
    units,
    props,
    options,
    {
      duration: by === 'chars' ? 0.6 : 0.9,
      stagger: by === 'lines' ? 0.08 : by === 'words' ? 0.04 : 0.018,
      ease: 'editorial',
    },
    [el],
    () => split.revert(),
  );
  return { ...handle, split };
}

/**
 * Reveal elements (cards, images, list items) with a preset as they enter the viewport.
 */
export function reveal(targets: TargetInput, options: RevealOptions = {}): RevealHandle {
  const els = resolveTargets(targets) as Element[];
  const preset = options.preset ?? 'fade-up';
  const props = typeof preset === 'string' ? revealPresets[preset] : preset;
  return start(
    els,
    props,
    options,
    { duration: 0.7, stagger: 0.06, ease: 'outExpo' },
    els,
    () => {},
  );
}
