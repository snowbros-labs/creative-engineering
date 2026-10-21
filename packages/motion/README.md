# @snowbros/motion

Timelines, scroll choreography, sticky pinning, accessible text splitting, FLIP and view transitions —
renderer-agnostic, reduced-motion aware, no dependencies beyond `@snowbros/core`.

```bash
pnpm add @snowbros/motion
```

## The model

- **Native scroll, never hijacked.** Layout is measured on resize; scrolling only does arithmetic.
- **Pinning is CSS `position: sticky`.** No spacers, no re-parenting; works with SSR, anchors,
  find-in-page and keyboard scrolling.
- **Everything seekable composes.** A `timeline`, a three.js camera rig, an SVG draw, a GSAP timeline
  (via `@snowbros/adapters`) — all can be driven by any progress source with `scrub()`.

## Quick start

```ts
import { pin, revealText, scrub, timeline } from '@snowbros/motion';

revealText(document.querySelector('h1')!, { by: 'lines', preset: 'rise', trigger: 'load' });

const story = pin(document.querySelector<HTMLElement>('#story')!, { distance: '250vh' });
const tl = timeline()
  .to('#story .title', { y: [60, 0], opacity: [0, 1] }, { duration: 1 })
  .label('media')
  .to(
    '#story .media',
    { clipPath: ['inset(20%)', 'inset(0%)'], scale: [1.2, 1] },
    { duration: 2 },
    'media',
  )
  .to('#story .caption', { opacity: [0, 1] }, { duration: 0.5 }, 'media+=1.2');
scrub(tl, story.progress, { smooth: 10 });
```

## API

| Export                                                | Notes                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `animate(targets, props, options)`                    | Plays immediately; returns a `Timeline`. Targets: selector, element(s), or plain objects (three.js vectors, uniforms). Props: `x y z rotate rotateX rotateY scale scaleX scaleY skewX skewY`, any CSS property, `--custom-props`, `attr:name`. Values: `to`, `[from, to]`, or `(index, target) => …`. |
| `timeline(options)`                                   | `.to()`, `.add()`, `.call()`, `.label()`; positions: seconds, `'>'`, `'<'`, `'+=0.2'`, `'label+=0.3'`.`play/pause/reverse/restart/seek/kill`, `finished` promise, `repeat`, `yoyo`.                                                                                                                   |
| `stagger(each, { from, grid, ease })`                 | `from`: `start` `center` `end` `random` or index; 2D grids.                                                                                                                                                                                                                                           |
| `scrollProgress(el, { start, end, axis, container })` | `"<element edge> <viewport edge>"`, edges `top center bottom <n>% <n>px`, `+=`/`-=` offsets.                                                                                                                                                                                                          |
| `scrub(seekable, source, { smooth, map })`            | Drives anything seekable; optional damping for weight without scroll-jacking.                                                                                                                                                                                                                         |
| `pin(section, { distance, top, sticky })`             | Sticky pin; returns `progress`. Warns if an ancestor's overflow breaks sticky.                                                                                                                                                                                                                        |
| `horizontalScroll(section, track, options)`           | Vertical scroll drives a horizontal rail; focus scrolls items into view.                                                                                                                                                                                                                              |
| `scrollVelocity()`                                    | Smoothed px/s signal (skew, marquee boost).                                                                                                                                                                                                                                                           |
| `splitText(el, { by, mask })`                         | Lines/words/chars; grapheme-safe; screen readers get the original text; interactive content is never hidden.                                                                                                                                                                                          |
| `revealText(el, options)`, `reveal(targets, options)` | Presets: `rise`, `fade-up`, `fade`, `blur`, `wipe`, `settle`. Triggers: `inview`, `load`, `manual`.                                                                                                                                                                                                   |
| `inView(targets, onEnter, options)`                   | One IntersectionObserver; `onEnter` may return a leave callback.                                                                                                                                                                                                                                      |
| `flip(elements, mutate, options)`                     | FLIP via WAAPI — reorder, filter, expand.                                                                                                                                                                                                                                                             |
| `viewTransition(update, { types })`                   | Same-document View Transitions with fallback.                                                                                                                                                                                                                                                         |

## Reduced motion

`animate`/`timeline` accept `reducedMotion: 'skip' | 'fade' | 'minimal' | 'keep'` (default `skip` —
jump to the end state). Reveals default to `fade`. For scroll scenes, choose a different layout with
`createMediaContext({ 'full-motion': …, 'reduced-motion': … })` from `@snowbros/core`.

## When not to use it

If the project already uses GSAP or Motion, keep it — use `@snowbros/adapters` to share the clock and
scrub those timelines from sticky pins. For simple hover/press/toggle states, CSS transitions are better.

License: MIT OR Apache-2.0.
