import {
  type MagneticOptions,
  type MarqueeOptions,
  magnetic,
  marquee,
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
