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

## Motion (motion.dev)

```ts
import { animate } from 'motion';
import { fromMotion } from '@snowbros/adapters';
scrub(fromMotion(animate('.card', { opacity: [0, 1] })), progress);
```

License: MIT OR Apache-2.0.
