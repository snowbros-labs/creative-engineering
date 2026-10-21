# Pattern family: scroll choreography

Model (observed in production on cvnt.in, see repository `docs/research/notes-live-inspection.md`):
**native scroll**, CSS `position: sticky` pinning, one passive scroll listener per container, layout
measured on resize, per frame only arithmetic → 0..1 progress → transforms. No scroll-jacking.

Contract: **progress** (scroll) · **start/end** (`"<element edge> <viewport edge>"`, e.g. `"top 80%"`)
· **smooth** (damping rate, optional) · **ease** (per segment) · **reduced motion** · **responsive**
(media contexts) · **cleanup** (dispose restores inline styles).

## 1. Scroll progress

```ts
import { scrollProgress } from '@snowbros/motion';
const p = scrollProgress(section, { start: 'top bottom', end: 'bottom top' });
const off = p.subscribe((v) => bar.style.setProperty('--progress', String(v)));
// cleanup: off(); p.dispose();
```

- Edges: `top | center | bottom | <n>% | <n>px`, with `+=`/`-=` offsets (`"top top+=80"` for a fixed header).
- `p.refresh()` after DOM changes ResizeObserver cannot see (content injected above without size change).

## 2. Pinned scene (sticky)

- **Intent:** hold a stage on screen while scroll advances a sequence.
- **Use:** product stories, step explanations, 3D camera moves. **Avoid:** content users need to skim; more than ~2–3 pinned scenes per page; on mobile when the scene doesn't adapt.
- **Markup:** `<section id="story"><div class="stage">…</div></section>` — the first child sticks.
- **Code:**

  ```ts
  import { pin, scrub, timeline } from '@snowbros/motion';
  const story = pin(section, { distance: '250vh', top: 0 });
  const tl = timeline()
    .to(title, { y: [60, 0], opacity: [0, 1] }, { duration: 1 })
    .label('media')
    .to(media, { scale: [1.2, 1] }, { duration: 2 }, 'media')
    .to(caption, { opacity: [0, 1] }, { duration: 0.5 }, 'media+=1.2');
  const s = scrub(tl, story.progress, { smooth: 10 });
  // cleanup: s.dispose(); story.dispose();  (dispose restores original styles)
  ```
- **Gotcha:** an ancestor with `overflow: hidden|auto|scroll` breaks sticky. Use `overflow: clip`. `pin()` warns in the console when it finds one.
- **Mobile:** pinned height uses `svh` so browser chrome show/hide does not jump. Consider shorter `distance` and a non-pinned layout below ~700 px via `createMediaContext`.
- **Reduced motion:** don't pin; show the final state of each step stacked vertically.

  ```ts
  import { createMediaContext } from '@snowbros/core';
  createMediaContext({
    '(min-width: 800px) and full-motion': (scope) => { const st = pin(section, { distance: '250vh' }); scope.add(st); scope.add(scrub(tl, st.progress)); },
  });
  ```
- **Equivalents:** GSAP ScrollTrigger `pin: true, scrub: true` (uses transform/fixed pinning with a spacer — heavier but handles overflow ancestors); Motion `useScroll({ target, offset: ['start start', 'end end'] })` + CSS sticky; CSS `animation-timeline: view()` with `animation-range` as progressive enhancement.

## 3. Horizontal sequence driven by vertical scroll

```ts
import { horizontalScroll } from '@snowbros/motion';
const h = horizontalScroll(section, track, { smooth: 12 });
```

- Pinned distance = track overflow, so speed feels 1:1.
- Keyboard: items remain in DOM order; focusing an item scrolls the page so it is visible (built in).
- **Avoid** on touch-first pages where a native horizontal `overflow-x: auto` + `scroll-snap-type: x mandatory` carousel is simpler and more familiar. Reduced → native horizontal scroller.

## 4. Parallax / layered depth

- **Intent:** depth separation between layers.
- **Rules:** small factors (0.05–0.2 of scroll distance); never on text being read; disabled under reduced motion (WCAG 2.3.3 names parallax as non-essential).
- **Code:** `const p = scrollProgress(layer.parentElement!); p.subscribe(v => layer.style.transform = \`translate3d(0, ${(v - 0.5) * -80}px, 0)\`)`.
- **CSS-only:** `animation-timeline: view()` on `transform` behind `@supports`.

## 5. Scroll velocity effects

`scrollVelocity()` → px/s signal, decays to 0. Use for subtle skew (`clamp(v / 300, -4, 4)` deg) or marquee speed boost. Disable under reduced motion. Never couple velocity to layout.

## 6. Smooth scrolling (Lenis etc.)

Default: **don't**. Native scroll is fastest, accessible and matches user settings; `scrub({ smooth })`
adds weight to the _animation_ without hijacking the scroll. If the project already uses Lenis, drive
the SNOWBROS ticker from it (`ticker.useExternalClock()`, call `ticker.tick(time)` in Lenis' raf) so
there is one clock.

## Testing checklist

- Scroll top → bottom → top: identical states both directions; no flicker at segment boundaries.
- Jump via anchor link / find-in-page / keyboard End: state correct after one frame.
- Resize and rotate: ranges re-measured; no stale offsets.
- Route away and back: one listener per container (check `getEventListeners(window)` in DevTools), styles restored.
- Performance trace while scrolling: no layout/recalc-style per frame from your code.
