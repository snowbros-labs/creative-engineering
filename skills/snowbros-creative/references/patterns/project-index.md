# Project index and case studies — the work as the reason to hire

Built on snowbros.me (2026-10-24). Implementation: `website/src/studio/{projects,render,main}.ts`.

## Content rules (before any design)

1. **Only verifiable claims.** Every line comes from the project's README, release notes or live
   site; numbers are quoted exactly (e.g. "234 SQL assertions", "~230 ms cold on axios"). No
   invented clients, metrics, quotes or awards.
2. **The owner decides the order.** Client products first if the studio sells services; their
   own tools after. Ask once, then encode the order in the data file.
3. **Imagery is the product itself**, captured from its live site or repo assets — never an old
   version of the studio's own site (check the header in every capture). When a live site is
   down, use the repo's own assets (report screenshots, product mockups) and say so.

## Structure

- **Data → static HTML at build time** (Vite `transformIndexHtml`): rows and full case studies
  are in the HTML, so the page is complete without JavaScript; case studies open via `:target`.
- **Row:** name in the expanded width of the display family, one-line "what it is", a meta list
  (kind / built with / year), one primary action ("Read the case") and one external link, the
  project's emblem, and its media on its own brand tone. Alternate sides on desktop; on phones
  stack name + emblem, media, copy.
- **Case study:** a dialog filled with the static article (moved in, moved back on close),
  coloured with the project's tone; problem → what we built → decisions that mattered → one
  large verified figure → links → "Next case". Hash routing (`#case-slug`) with
  `pushState`/`popstate`; Esc closes and returns focus to the opener.
- **Transition:** View Transitions API with one shared name on the row media and the case media
  (560 ms, drawer curve); swallow `AbortError` when a new transition interrupts. Reduced motion:
  no transition.

## Media rules

- Give every `<img>` and `<source>` its intrinsic `width`/`height` (per image — strips and
  mockups differ) so nothing shifts as images load.
- WebP + JPEG fallback; phone sources cropped to what phones actually show (4:5 first screen),
  not full-page captures hidden by `object-fit`. Wide strips (dashboards) skip the crop.
- All project media lazy; unmask with `clip-path: inset(0 0 100% 0) → inset(0)` once on enter;
  depth parallax on the `<picture>` (not the `<img>`, which owns hover and clip transforms).

## Traps seen

- A grid rule such as `.hero-title { grid-column: 1 / 9 }` reused inside another grid creates
  implicit columns and squeezes siblings into circles. Scope column rules to their layout.
- Hidden fallback text that is wider than the viewport still causes horizontal overflow
  (`visibility: hidden` keeps layout) — clip its container.
