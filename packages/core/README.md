# @snowbros/core

Dependency-free foundation for SNOWBROS Creative Engineering: one shared frame loop, easing, springs,
lifecycle scopes, signals, capability and motion-preference detection.

```bash
pnpm add @snowbros/core
```

## Why

Every animated system on a page — DOM tweens, scroll scenes, a WebGL stage, a canvas field — should
read the same frame time from **one** `requestAnimationFrame` loop, clean up deterministically, and
respect the user's motion preference. `core` is that contract, with no dependencies.

## API

| Export                                                                | What it does                                                                                                                                                                                                                   |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ticker`                                                              | Shared loop. `ticker.add(fn, priority?)` → unsubscribe. Priorities: `Priority.input` (-100), `update` (0), `render` (100). Sleeps when idle or the tab is hidden. `timeScale`, `maxDelta`, `useExternalClock()`, `tick(time)`. |
| `createTicker()`                                                      | Isolated ticker (tests, embedded widgets).                                                                                                                                                                                     |
| `eases`, `cubicBezier()`, `resolveEase()`, `toCssLinear()`            | Named curves (`outExpo`, `editorial`, `cinematic`, …), a CSS-exact cubic-bezier solver, and export of any JS curve to CSS `linear()`.                                                                                          |
| `springPosition()`, `springEase()`, `springDuration()`, `springs`     | Analytic (seekable) damped springs; convert to an ease + natural duration.                                                                                                                                                     |
| `createSpringValue()`                                                 | Stateful spring that keeps velocity when retargeted — pointer following, magnetic UI, drag release.                                                                                                                            |
| `createScope()`                                                       | Lifecycle container: `add`, `listen` (auto-removed via `AbortSignal`), `child`, `dispose`, `signal`.                                                                                                                           |
| `createSignal()`, `derive()`                                          | Minimal observable values; `useSyncExternalStore`-compatible.                                                                                                                                                                  |
| `motionPreference`, `prefersReducedMotion()`, `setMotionPreference()` | OS setting + optional in-app override, reactive.                                                                                                                                                                               |
| `capabilities()`, `deviceTier()`                                      | WebGL/WebGL2/WebGPU, scroll timelines, view transitions, pointer type, save-data; `low`/`mid`/`high` tier heuristic.                                                                                                           |
| `createMediaContext()`                                                | Responsive + preference-aware setup/teardown, with `reduced-motion` / `full-motion` keywords.                                                                                                                                  |
| `clamp`, `lerp`, `invLerp`, `mapRange`, `damp`, `wrap`, `segment`     | Math. `damp` is frame-rate independent; `segment(p, a, b)` splits one progress into sub-ranges.                                                                                                                                |
| Types                                                                 | `ProgressSource`, `Seekable`, `Playable`, `TimingOptions`, `ExpressionOptions`, `ReducedMotionPolicy`, `PatternHandle` — the interaction contract.                                                                             |

## Examples

```ts
import { createMediaContext, createScope, damp, Priority, ticker } from '@snowbros/core';

// Frame-rate independent follow
let x = 0;
const off = ticker.add(({ delta }) => {
  x = damp(x, targetX, 10, delta);
  dot.style.transform = `translate3d(${x}px,0,0)`;
}, Priority.update);

// Different setups per viewport and motion preference; torn down automatically when they stop matching
createMediaContext({
  '(min-width: 900px) and full-motion': (scope) => {
    scope.listen(window, 'pointermove', onMove);
  },
  'reduced-motion': () => showStaticState(),
});
```

## Guarantees

- No module-level DOM writes; safe to import during SSR (browser APIs are guarded).
- `scope.dispose()` runs cleanups in reverse order, once, and keeps going if one throws.
- Registering on a disposed scope disposes the item immediately (no leaks from late async work).

License: MIT OR Apache-2.0.
