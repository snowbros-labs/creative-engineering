# Motion system

## Functional vs expressive

IBM Carbon names the split: **productive** motion is "efficient and responsive" for task moments;
**expressive** motion is "lively and highly visible" for significant moments
(https://carbondesignsystem.com/elements/motion/overview/). SNOWBROS uses _functional_ and _expressive_.

| Context                                                | Duration                         | Easing / spring                                                                                                                                                  | Sources                                               |
| ------------------------------------------------------ | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Functional: hover, press, toggle, focus                | **50–150 ms**                    | M3 standard `cubic-bezier(0.2, 0, 0, 1)` or Carbon productive standard `(0.2, 0, 0.38, 0.9)`; effects spring (damping ratio 1.0)                                 | M3 short1–3, Carbon fast-01/02, Fluent ultraFast–fast |
| Functional: dropdown, popover, tooltip, row expand     | **150–250 ms**                   | in: Carbon entrance `(0, 0, 0.38, 0.9)`; out: exit `(0.2, 0, 1, 0.9)`; exits ~20–30% shorter                                                                     | Carbon moderate-01/02, NN/g                           |
| Functional: modal, drawer, route change                | **200–400 ms**                   | in: M3 emphasized decelerate `(0.05, 0.7, 0.1, 1)`; out: emphasized accelerate `(0.3, 0, 0.8, 0.15)`; or M3 standard spatial spring (damping 0.9, stiffness 700) | NN/g 200–300 ms modals; M3 medium                     |
| Expressive: hero reveal, onboarding milestone, success | **400–700 ms**                   | Carbon expressive standard `(0.4, 0.14, 0.3, 1)`; M3 expressive spatial spring (0.8 / 380)                                                                       | Carbon slow-01/02, M3 long                            |
| Expressive: cinematic / scroll-linked (marketing only) | tied to scroll, or ≤ **1000 ms** | always interruptible; crossfade or static under reduced motion                                                                                                   | M3 extraLong4                                         |

Cited token values (fetched 2026-10-21; see repository `docs/research/notes-references.md`):
- **IBM Carbon** durations: fast-01 70, fast-02 110, moderate-01 150, moderate-02 240, slow-01 400, slow-02 700 ms. Productive: standard (0.2,0,0.38,0.9), entrance (0,0,0.38,0.9), exit (0.2,0,1,0.9). Expressive: standard (0.4,0.14,0.3,1), entrance (0,0,0.3,1), exit (0.4,0.14,1,1).
- **Material 3** durations: short 50/100/150/200, medium 250/300/350/400, long 450/500/550/600, extra-long 700/800/900/1000 ms. Easing: emphasized (0.2,0,0,1), emphasized decelerate (0.05,0.7,0.1,1), emphasized accelerate (0.3,0,0.8,0.15), standard (0.2,0,0,1). Springs (damping ratio / stiffness) — Standard: fast spatial 0.9/1400, default spatial 0.9/700, slow spatial 0.9/300; Expressive: 0.6/800, 0.8/380, 0.8/200; effects springs 1.0 / 3800, 1600, 800 in both (never bounce).
- **Fluent 2** durations: 50, 100, 150, 200, 250, 300, 400, 500 ms; decelerateMax (0.1,0.9,0.2,1), easyEase (0.33,0,0.67,1).
- **NN/g**: most UI animation 100–500 ms; ~100 ms simple feedback; 200–300 ms modal; 400 ms "very slow"; ≥500 ms "feels like a drag"; entrances slightly longer than exits.
- **Apple HIG**: no ms values; "avoid adding motion to UI interactions that occur frequently", "Let people cancel motion", never use motion as the only way to communicate.
- **WCAG 2.2 SC 2.3.3** (AAA): interaction-triggered motion can be disabled unless essential; parallax is non-essential.

`@snowbros/core` springs are physical (stiffness/damping/mass). M3 damping _ratio_ ζ maps to damping
`c = 2ζ√(k·m)`; e.g. ratio 0.9, stiffness 700, mass 1 → damping ≈ 47.6.

## Rules

1. **Frequency sets the budget.** Daily/hourly actions get functional motion or none.
2. **Motion encodes causality.** Things move from where they came from to where they went (FLIP, shared elements). No motion without a cause.
3. **Interruptible.** Never block input during animation. Springs retarget from current velocity (`createSpringValue`); timelines can reverse.
4. **One clock.** One rAF loop (`ticker` from `@snowbros/core`), one scroll source per page. If Lenis/GSAP exists, drive SNOWBROS from it via `ticker.useExternalClock()` + `ticker.tick(time)`.
5. **Entrances decelerate, exits accelerate, moves ease in-out.**
6. **Stagger small.** 20–80 ms per item, cap total stagger ≈ 400 ms for UI; lines 60–100 ms; chars 15–30 ms.
7. **Distance scales duration.** Larger travel/area → longer, within the range for its class.
8. **Spatial springs may overshoot; effects (opacity/color) never.**
9. **Reduced motion policy per pattern:** `skip` (decorative entrances), `fade` (spatial → ≤200 ms opacity), `minimal` (shorter, smaller), `keep` (essential and gentle; justify).

## Composition: one progress, many elements

Coordinate a pinned scene by splitting **one** progress into segments instead of creating several
scroll triggers. `segment(p, start, end)` from `@snowbros/core` returns a 0..1 ramp for a sub-range.

```ts
import { segment } from '@snowbros/core';
import { pin } from '@snowbros/motion';

const story = pin(section, { distance: '300vh' });
story.progress.subscribe((p) => {
  const title = segment(p, 0.0, 0.25); // title rises
  const media = segment(p, 0.15, 0.6); // media scales in, overlapping
  const cards = segment(p, 0.55, 0.95); // cards slide in
  titleEl.style.transform = `translate3d(0, ${(1 - title) * 40}px, 0)`;
  titleEl.style.opacity = String(title);
  mediaEl.style.transform = `scale(${1.2 - 0.2 * media})`;
  cardsEl.style.transform = `translate3d(${(1 - cards) * 30}%, 0, 0)`;
  rig.seek(p); // a 3D camera rig on the same progress
});
```

Or author a `timeline()` with labels and `scrub()` it — the timeline duration becomes a ratio of the
pinned distance. Either way: one progress source, deterministic in both scroll directions.

Lifecycle for composed scenes:
- Create everything inside one scope; dispose it on unmount/route change.
- Resize: progress sources re-measure automatically (ResizeObserver + `resize`); call `refresh()` after DOM changes observers cannot see.
- Reverse scrolling must produce the same states as forward; test it.
- Route change mid-animation: kill timelines, dispose pins (restores styles), dispose GPU resources.
- Do not build a global choreography framework; a scene is a function returning a disposer.
