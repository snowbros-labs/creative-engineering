# @snowbros/fx

## 0.2.0

### Minor Changes

- 2400a0f: scene: `createStage` now sleeps when idle in `demand` mode (no ticker subscription until `invalidate()`),
  `pointerParallax` and `createOrbitInertia` (with `autoSpin: 0`) settle and unsubscribe — a resting page
  schedules zero animation frames. New `camera.fit` keeps a subject framed on portrait screens.
  adapters: `driveRiveInput` (progress → Rive state-machine input), `stepPhysics` (fixed-step Rapier-style
  worlds on the shared ticker) and `soundCues` (opt-in, remembered Howler-style sound cues).
  fx: `annotate({ type: 'arrow', direction, length, lean })` hand-drawn affordance arrows; `flowField` warns
  when `speed`/`density` are passed as fractions.
  react: `usePressable` and `useProximity` hooks.
- f27085b: Add `haptic()` and `SpringValue.impulse()` (core) and `annotate()`, `pressable()`, `proximity()` (fx) — tactile and
  editorial primitives found necessary while building the flagship site.

### Patch Changes

- Updated dependencies [f27085b]
  - @snowbros/core@0.2.0
  - @snowbros/motion@0.1.1
