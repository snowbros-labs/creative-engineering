# Material fields — a persistent particle material that answers input

Built and measured on snowbros.me (2026-10-24, "Frost"). Use when a brand needs one signature
interaction that runs through the whole site rather than a hero effect. Implementation:
`website/src/studio/frost.ts` + `emblems.ts` in the creative-engineering repo.

## The idea in one paragraph

One set of particles (crystals) lives on the page. Each section offers a **zone** (`data-frost`)
with a **form**: sampled text (`wordmark`, `text:VED`) or a procedural emblem (`emblem:graph`).
The particles freeze into the visible zone's form, **travel** to the next form as the visitor
scrolls (warm while in flight), and **thaw** under the pointer or finger. Heat = colour (signal),
cold = ink. The material is the brand; the forms are its content.

## Decision rules

1. **Document space, not viewport space.** Particles and the canvas live in document
   coordinates; the canvas is sized to the particles' bounding box (+48 px pad, grown in 192 px
   steps) and placed with `transform`. Native scroll then moves a frozen field for free.
   Measured: a full-viewport canvas redrawn every scroll frame took the page from 60 → 30 fps
   (CPU raster); the document-space canvas holds ~48 fps in real GPU Chrome even while the swarm
   travels, and costs 0 frames when frozen.
2. **Sleep is a feature.** Unsubscribe from the ticker when every particle is home, cold and
   slow; snap settled particles exactly onto their targets so nothing drifts sub-pixel. Wake on
   input, on a zone change (check `pickZone()` inside the passive scroll listener — do not wake
   on every scroll), on resize, on `visibilitychange`.
3. **Input is a path, not a point.** Keep each pointer/touch move as a segment from the previous
   sample (and expand `getCoalescedEvents()`); apply influence by distance to the segment. A
   fast flick otherwise skips straight over the particles between two samples (the "strum
   only triggers where the browser sampled" bug). Touch: use `touchmove` (it keeps firing during
   native scroll); `pointermove` gets cancelled once the browser takes the gesture.
4. **Speed sets melt.** `melt = clamp(speed / 1400, 0.08, 1)` — slow movement breathes, fast
   movement melts. Push along the segment direction (velocity transfer) plus a small outward
   push; strikes (tap/click/button press) are radial.
5. **Heat loosens the spring.** `k = 170 · (1 − 0.9·heat)`, damping `2·√k·0.88`; heat decays
   `e^(−1.05·t)`. Hot particles get a curl-like drift so melt reads as material, not noise.
6. **Palette by ground, per particle.** Mark sections with `data-frost-bg="paper|ink|signal"`;
   classify each particle by the band under it (innermost band wins) and stroke per
   (ground × heat) list. One global colour fails the moment particles cross a dark band or sit
   on an orange tile.
7. **Travel, staggered.** On a zone change, sort particles and targets left-to-right and map
   them in order, holding each for `(k/N)·0.32 s` — a sweep, not an explosion. Owners notice and
   like the swarm following their scroll; do not replace travel with an in-place fade.
8. **Re-measure when anything above moves.** `ResizeObserver` on every zone **and** on
   `document.body` (lazy images, fonts, mounted benches shift zones without resizing them) and
   on `load`. Stale zone positions look like "an element moving with the projects".
9. **Budgets.** Particles: 2600 desktop high tier, 1800 mid, 1100 low/phone. DPR cap 2 (1.5 on
   phones/low tier). Three-axis "flake" every 7th particle when frozen. 9 stroke calls max.
10. **Content never depends on it.** The wordmark exists as real text (`.wordmark-fallback`,
    hidden only once `html.frost-on` is set); the canvas is `aria-hidden`; headings are real.
11. **Reduced motion:** forms appear in place, no melting, no travel, no idle frames.

## Anti-patterns

- Literal falling snow. The material should _form things_, not decorate the sky.
- A full-screen fixed canvas that redraws on scroll.
- Sampling only the pointer position per event.
- A single colour for the whole field across differently coloured sections.
- Emblems that mean nothing: each project's emblem is drawn from what it is (import graph,
  play mark, molecule, ledger, open book, phone ↔ PC).

## Verify

- Frame intervals while wheel-scrolling the whole page, real GPU Chrome (`headless: false`),
  with and without the canvas (`.frost{display:none}`) — the delta is the field's cost.
- `window.__frost.awake()` must become `false` within a few seconds of the last input.
- Drag a finger across the form on a phone: the thaw must follow the whole path.
