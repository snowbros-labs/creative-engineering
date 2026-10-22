# @snowbros/adapters

Use SNOWBROS alongside the libraries you already have — one frame loop, one scroll model — without
this package importing, bundling or redistributing them. Adapters are typed structurally.

```bash
pnpm add @snowbros/adapters
```

## Lenis (optional smooth scroll)

```ts
import Lenis from 'lenis';
import { smoothScroll } from '@snowbros/adapters';

const smooth = smoothScroll({ create: () => new Lenis({ lerp: 0.12 }) });
// Driven by the shared SNOWBROS ticker. Not created on touch-primary devices or under reduced
// motion, and destroyed if the user switches to reduced motion at runtime.
```

## GSAP

```ts
import gsap from 'gsap';
import { fromGsap, shareGsapTicker } from '@snowbros/adapters';
import { pin, scrub } from '@snowbros/motion';

shareGsapTicker(gsap.ticker); // one loop for both systems
const tl = gsap.timeline({ paused: true }).to('.title', { yPercent: -100 });
scrub(fromGsap(tl), pin(section).progress); // sticky pin drives a GSAP timeline
```

GSAP is distributed under its own "Standard no-charge" license (not OSI-approved,
https://gsap.com/standard-license). It applies to your application when you install GSAP; this package
contains no GSAP code.

Measured on the SNOWBROS site (2026-10-22): GSAP timelines created paused and driven with
`scrub(fromGsap(tl), progress)` add zero frames while the page is idle — only the SNOWBROS ticker
runs, and it sleeps. Prefer that over `shareGsapTicker` when you have no free-running GSAP tweens,
and measure idle frames if you do share the ticker. Don't add ScrollTrigger next to
`scrollProgress`/`pin` for the same elements: one scroll model per page.

## Rive (state-machine artwork)

```ts
import { Rive } from '@rive-app/canvas';
import { driveRiveInput } from '@snowbros/adapters';
import { scrollProgress } from '@snowbros/motion';

const r = new Rive({
  src: '/mark.riv',
  canvas,
  stateMachines: 'Main',
  autoplay: true,
  onLoad: () => {
    const progress = r.stateMachineInputs('Main').find((i) => i.name === 'progress');
    if (progress) driveRiveInput(progress, scrollProgress(section)); // number → 0..100
  },
});
```

Boolean inputs flip at `threshold` (default 0.5). The adapter never imports the Rive runtime.

## Motion (motion.dev)

```ts
import { animate } from 'motion';
import { fromMotion } from '@snowbros/adapters';
scrub(fromMotion(animate('.card', { opacity: [0, 1] })), progress);
```

## Physics (Rapier)

```ts
import RAPIER from '@dimforge/rapier3d-compat';
import { stepPhysics } from '@snowbros/adapters';

await RAPIER.init();
const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
const physics = stepPhysics(world, { hz: 60, onStep: () => stage.invalidate() });
```

Fixed-rate stepping on the shared ticker (accumulator, capped sub-steps). Pass `isAsleep` to let
the loop sleep when nothing moves, and call `physics.wake()` after an impulse. Use physics only when
the interaction _is_ physics — springs from `@snowbros/core` cover UI feel.

## Audio (Howler.js)

```ts
import { Howl } from 'howler';
import { soundCues } from '@snowbros/adapters';

const sfx = soundCues({ pluck: new Howl({ src: ['/pluck.webm', '/pluck.mp3'] }) });
soundButton.onclick = () => sfx.setEnabled(!sfx.enabled); // remembered; off by default
sfx.play('pluck'); // silent until the visitor opts in
```

Opt-in by design: off until enabled, remembered in `localStorage`, throttled per cue, silent in
hidden tabs, stops everything when switched off.

License: MIT OR Apache-2.0.
