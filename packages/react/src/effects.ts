import {
  type MagneticOptions,
  type MarqueeOptions,
  magnetic,
  marquee,
  type PressableOptions,
  type ProximityOptions,
  pressable,
  proximity,
  type SpotlightOptions,
  spotlight,
  type TiltOptions,
  tilt,
} from '@snowbros/fx';
import type { RefObject } from 'react';
import { useSnowbros } from './hooks.js';

type Ref = RefObject<HTMLElement | null>;

/** Pointer attraction (fine pointers only; no-op on touch). */
export function useMagnetic(ref: Ref, options: MagneticOptions = {}): void {
  useSnowbros(
    (scope) => {
      if (ref.current) scope.add(magnetic(ref.current, options));
    },
    [ref, JSON.stringify({ ...options, inner: undefined }), options.inner],
  );
}

/** 3D pointer tilt (fine pointers only). */
export function useTilt(ref: Ref, options: TiltOptions = {}): void {
  useSnowbros(
    (scope) => {
      if (ref.current) scope.add(tilt(ref.current, options));
    },
    [ref, JSON.stringify(options)],
  );
}

/** Infinite marquee; static under reduced motion. */
export function useMarquee(ref: Ref, options: MarqueeOptions = {}): void {
  useSnowbros(
    (scope) => {
      if (ref.current) scope.add(marquee(ref.current, options));
    },
    [ref, options.speed, options.direction, options.pauseOnHover, options.velocityBoost],
  );
}

/** Pointer-following CSS variables (`--sb-x`, `--sb-y`) for radial highlights. */
export function useSpotlight(ref: Ref, options: SpotlightOptions = {}): void {
  useSnowbros(
    (scope) => {
      if (ref.current) scope.add(spotlight(ref.current, options));
    },
    [ref, JSON.stringify(options)],
  );
}

/** Spring-backed press depth (`--sb-press`, 0..1) with an optional haptic tick on supporting phones. */
export function usePressable(ref: Ref, options: PressableOptions = {}): void {
  useSnowbros(
    (scope) => {
      if (ref.current) scope.add(pressable(ref.current, options));
    },
    [ref, JSON.stringify({ ...options, spring: options.spring ?? null })],
  );
}

/**
 * Pointer proximity (`--sb-proximity`, 0 far … 1 under the pointer) on the ref'd element's children
 * matching `selector` (default: the element itself). Fine pointers only unless `force`.
 */
export function useProximity(
  ref: Ref,
  options: ProximityOptions & { selector?: string } = {},
): void {
  const { selector, ...rest } = options;
  useSnowbros(
    (scope) => {
      const root = ref.current;
      if (!root) return;
      const targets = selector ? Array.from(root.querySelectorAll<HTMLElement>(selector)) : [root];
      scope.add(proximity(targets, rest));
    },
    [ref, selector, JSON.stringify(rest)],
  );
}
