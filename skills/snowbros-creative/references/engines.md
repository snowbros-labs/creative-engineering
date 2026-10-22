# Engines — mixing GSAP, Lenis, three/R3F, Rive, Radix, Rapier and Howler with SNOWBROS

Decide with [toolkit-and-libraries.md](toolkit-and-libraries.md) first. This file is the _how_:
working recipes that keep **one ticker, one scroll model, one owner per property**.

Ownership table — fill it before writing code:

```
Concern            Owner                         Notes
frame loop         @snowbros/core ticker         GSAP/Lenis/Rapier join it via adapters
scroll progress    @snowbros/motion scrollProgress (or ScrollTrigger — never both)
smooth wheel       Lenis via smoothScroll        desktop only, off for reduced motion
authored sequences GSAP timelines (paused)       scrubbed by our progress, or played once
UI micro-motion    CSS / @snowbros/motion        hover, press, menu
3D                 three via @snowbros/scene     or R3F in React apps
designer vectors   Rive                          inputs driven by our progress
physics            Rapier via stepPhysics        only if interaction is physical
sound              Howler via soundCues          opt-in
a11y primitives    Radix (React) / native        dialog, menu, popover, tabs
```

## GSAP — authored sequences, SplitText masks

Install: `npm i gsap` (free incl. SplitText since 3.13; GSAP Standard License, not OSI — note it in
THIRD_PARTY_NOTICES). Load it lazily when it is below the fold.

Scroll-scrubbed, without ScrollTrigger (one scroll model):

```ts
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { fromGsap } from '@snowbros/adapters';
import { scrollProgress, scrub } from '@snowbros/motion';
gsap.registerPlugin(SplitText);

await document.fonts.ready; // split in the final face
const split = SplitText.create(title, { type: 'words', mask: 'words' });
const tl = gsap
  .timeline({ paused: true })
  .from(split.words, { yPercent: 110, stagger: 0.08, ease: 'power3.out' });
const p = scrollProgress(section, { start: 'top 85%', end: 'center 60%' });
const handle = scrub(fromGsap(tl), p, { smooth: 10 });
// cleanup: handle.dispose(); p.dispose(); split.revert(); tl.kill();
```

Played once (entrance), still on our clock: `shareGsapTicker(gsap.ticker)` then
`gsap.timeline().from(...)`. Measure idle frames afterwards (visual-qa.md §5).

ScrollTrigger only if the project is already GSAP-first; then skip `pin`/`scrollProgress` for
those sections and let `ScrollTrigger` own scroll (and Lenis must call `ScrollTrigger.update`).

Reduced motion: wrap in `createMediaContext({ 'full-motion': … })` so nothing is split or hidden
when motion is reduced — the static HTML is the final state. Live example: `website/src/sections/closing.ts`.

## Lenis — smoothed wheel

```ts
import Lenis from 'lenis';
import { smoothScroll } from '@snowbros/adapters';
const smooth = smoothScroll({ create: () => new Lenis({ lerp: 0.1 }) });
```

Off on touch and reduced motion automatically. Keep native anchors: in-page links still work
because Lenis keeps native scroll position. Don't add it to product UI or forms-heavy pages.

## three.js — vanilla

```ts
import { createStage, withFallback } from '@snowbros/scene';
const stage = createStage({
  container,
  alpha: true,
  renderMode: 'demand',
  camera: { fov: 30, position: [0, 0, 6], fit: 1.2 },
});
```

`renderMode: 'demand'` + `invalidate()` on change = zero frames when idle (the stage, parallax and
orbit inertia all sleep). `fit` keeps the subject framed on portrait phones. Always provide an SVG
or image fallback (`withFallback`) and a static reduced-motion pose.

WebGPU/TSL: three's `WebGPURenderer` is a separate entry (`three/webgpu`); `@snowbros/scene`
manages `WebGLRenderer`. Use WebGPU only for a feature that needs it, feature-detect
`navigator.gpu`, and keep the WebGL path.

## React Three Fiber

Stay inside R3F: `<Canvas frameloop="demand">`, `invalidate()` from `useThree`. Use
`@snowbros/core` for reduced motion (`prefersReducedMotion`) and springs if useful; don't mount a
`createStage` inside a Canvas. If GSAP drives scene values, write to refs in a paused timeline and
`invalidate()` in `onUpdate`.

## Rive — designer-authored states

```ts
import { Rive } from '@rive-app/canvas';
import { driveRiveInput } from '@snowbros/adapters';
const r = new Rive({
  src: '/mark.riv',
  canvas,
  stateMachines: 'Main',
  autoplay: true,
  onLoad: () => {
    r.resizeDrawingSurfaceToCanvas();
    const input = r.stateMachineInputs('Main').find((i) => i.name === 'progress');
    if (input) driveRiveInput(input, scrollProgress(section));
  },
});
```

Pick Rive when a designer must author the states (characters, illustrated marks). Geometric or
procedural art is lighter as SVG/canvas with our fx. Static fallback: a poster image or SVG.
Reduced motion: set the state machine to its end state and don't drive it.

## Radix UI (React)

Use `@radix-ui/react-dialog` / `-dropdown-menu` / `-popover` / `-tabs` for focus management and
ARIA in React projects. Animate with CSS on `[data-state="open"|"closed"]` and
`@starting-style`, or with `motion` on mount — not with a second engine fighting Radix's
presence logic. Non-React stacks: native `<dialog>` + the shell pattern (focus in, Tab contained,
Escape closes, focus returns).

## Rapier — physics

```ts
import RAPIER from '@dimforge/rapier3d-compat';
import { stepPhysics } from '@snowbros/adapters';
await RAPIER.init();
const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
const physics = stepPhysics(world, {
  hz: 60,
  onStep: () => stage.invalidate(),
  isAsleep: () => bodies.every((b) => b.isSleeping()),
});
```

Only when the interaction is physical (stacking, collisions, vehicles). Lazy-load the WASM.

## Howler — sound

```ts
import { Howl } from 'howler';
import { soundCues } from '@snowbros/adapters';
const sfx = soundCues({ pluck: new Howl({ src: ['/pluck.webm', '/pluck.mp3'], volume: 0.4 }) });
```

Off by default, visible toggle, remembered, throttled. Never autoplay. Pair sound with a visual
and (on phones) haptic cue — never sound alone.

## Conflicts to check before merging

- Two engines writing `transform` on the same element (GSAP + `animate` + CSS transition).
- ScrollTrigger **and** `scrollProgress`/`pin` on one page; Lenis **and** Locomotive.
- A library with its own rAF loop running while idle (count frames).
- GSAP SplitText and `splitText` on the same element.
- Radix presence + an exit animation from another engine.
