import { tokens } from './tokens.js';

export { type Tokens, tokens } from './tokens.js';

type Bezier = readonly [number, number, number, number];

/** `cubic-bezier()` string for a token easing — pass straight to `animate({ ease })` or CSS. */
export const bezier = (b: Bezier): `cubic-bezier(${string})` =>
  `cubic-bezier(${b[0]}, ${b[1]}, ${b[2]}, ${b[3]})`;

/**
 * Two motion vocabularies, one system.
 *
 * - `functional`: product UI — fast, quiet, no overshoot. Feedback, menus, dialogs, tables.
 * - `expressive`: storytelling — slower, more decisive curves. Heroes, reveals, scroll scenes.
 *
 * Rule of thumb: the more often a user triggers it, the more functional it must be.
 */
export const motion = {
  functional: {
    feedback: {
      duration: tokens.motion.duration.quick,
      ease: bezier(tokens.motion.easing['functional-standard']),
    },
    enter: {
      duration: tokens.motion.duration.moderate,
      ease: bezier(tokens.motion.easing['functional-enter']),
    },
    exit: {
      duration: tokens.motion.duration.base,
      ease: bezier(tokens.motion.easing['functional-exit']),
    },
    layout: {
      duration: tokens.motion.duration.moderate,
      ease: bezier(tokens.motion.easing.emphasized),
    },
  },
  expressive: {
    enter: {
      duration: tokens.motion.duration.deliberate,
      ease: bezier(tokens.motion.easing['expressive-enter']),
    },
    exit: {
      duration: tokens.motion.duration.slow,
      ease: bezier(tokens.motion.easing['expressive-exit']),
    },
    reveal: {
      duration: tokens.motion.duration.deliberate,
      ease: bezier(tokens.motion.easing.editorial),
    },
    camera: {
      duration: tokens.motion.duration.cinematic,
      ease: bezier(tokens.motion.easing.cinematic),
    },
  },
} as const;
