# Signature techniques — learned from award-level sites, re-expressed as patterns

Each pattern below was observed by scrolling, hovering and interacting with a live reference
(2026-10-21/22, Playwright, 1440×900 and 390×844). The pattern is described brand-neutrally, with
the engineering behind it and how to build it with our stack. **Never reproduce the reference's
look; reproduce the principle in the project's own identity.**

Pick at most **one** signature technique per page and two or three supporting ones. A page with
six signatures has none.

---

## 1. The scribble over the type (hand-made mark on engineered layout)

Observed: landonorris.com — a hand-drawn accent scribble written over a two-line headline
("ON / TRACK"), a signature drawn across a portrait; ink everywhere on messenger.abeto.co.

Why it works: a single human gesture on precise typography reads as authorship and points the
eye to the one word that matters.

Build: `annotate(el, { type: 'underline' | 'circle' | 'cross' | 'arrow', roughness, seed })`
(`@snowbros/fx`). Draw it on enter (default), keep it seeded so it is identical every visit.
Reduced motion: appears drawn.

Rules: 1–3 marks per page, accent colour only, never on body text, never decorative-only — the
marked word must carry the argument.

## 2. Teach the interaction once, in hand (affordance arrow)

Observed: bruno-simon.com — a hand-lettered "CLICK TO START" with a drawn arrow to the car and a
sound icon; nothing else on screen explains the controls.

Build: a short visible hint ("Tap to pluck", switched by `(pointer: coarse)` media query) plus
`annotate(hint, { type: 'arrow', direction, length, lean })` pointing at the object. Show it only
when the interaction is actually available (e.g. after WebGL mounts).

## 3. Two voices in one sentence

Observed: landonorris.com sets a bold grotesk and a display serif inside one headline
("Hall of Fame", "partners &campaigns"); scoutmotors.com uses one family in several widths plus
mono labels.

Build: wrap the carrying words in `<em>` and give `em` the second face; or a variable font's
`wdth`/`wght` axes. Let pointer proximity change the axis (`proximity()` → `--sb-proximity` →
`font-variation-settings`) for a living manifesto. Fine pointers only.

## 4. The orbit — a headline ringed by specimens

Observed: scoutmotors.com — a giant three-line headline with numbered archival cards arranged on
a drafting circle (thin circle guide + crosshair hairlines), rotating with scroll, paper grain
background.

Build: absolute chips/cards placed on an ellipse from measured box size; scroll rotates the ring
via `scrollProgress` → `scrub(..., { smooth })`. Keep DOM order = reading order (links stay
tabbable in sequence). Desktop + full motion only; phones get a plain grid.

## 5. Notched and tabbed frames

Observed: landonorris.com — helmet cards framed by hairlines with a diagonal notch carrying the
caption; the footer is a dark rounded card with a raised tab in the middle of its top edge
(concave shoulders), on a coloured page.

Why: one custom silhouette makes stock components feel owned.

Build: `clip-path: polygon()` for notched cards (keep borders as an inset SVG or pseudo-element);
the tab as an absolutely positioned block with two radial-gradient pseudo-elements forming the
concave shoulders. Put the brand motif in the tab.

## 6. Footer as destination

Observed: landonorris.com — closing statement in two voices, signature, nav columns, partner
marquee and a single "Business enquiries" key inside the card; scoutmotors.com — a full-bleed
accent band with a giant cropped word ("RESERVE") behind one dark button.

Build: closing headline + one primary action + compact nav + a fitted wordmark (measured to the
column, see responsive-art-direction.md). Scrub the wordmark letters up from the baseline as the
page ends (GSAP timeline or `motion.timeline`, driven by `scrollProgress`).

## 7. Cinematic band with protected text

Observed: scoutmotors.com — full-bleed golden-hour video; copy sits in a darkened band at the
bottom or a left column; on phones the headline sits over the lower third of the image.

Build: `<video muted playsinline autoplay loop poster>` only when you have real footage; text in
a gradient scrim region (verify contrast on the brightest frame); pause offscreen with `inView`.
No footage → do not fake it; use a procedural field (`flowField`) or the motif instead.

## 8. The tactile key

Observed: messenger.abeto.co — one chunky "BEGIN" key with an offset bottom edge;
landonorris.com — square accent keys ("Store", menu, "tap to lock").

Build: `pressable(el)` writes `--sb-press`; CSS translates the key down and collapses its bottom
shadow; optional `haptic('press')` on phones. One key style per site, used for primary actions.

## 9. Segmented floating navigation

Observed: scoutmotors.com — nav split into two rounded white segments joined by a small accent
connector; landonorris.com on phones — just two square keys (Store, Menu).

Build: header grid that becomes a floating pill once scrolled (`data-scrolled`), a spring-driven
current-section pill, and on phones only brand + one menu key. Any labels attached to the header
must hide with it.

## 10. Menu as a composed page

Observed: scoutmotors.com — the menu is a white card over the blurred page with text links on one
side and two product tiles + an accent "reserve" tile; landonorris.com — full-screen panel.

Build: `role="dialog"` + `aria-modal`, focus moved in and contained, Escape and every link close
it, scroll locked while open (shell pattern in this repo's website). Give it one featured action
and one live element (clock, glyph, current section) — not just a list.

## 11. World as interface (only when exploration is the point)

Observed: bruno-simon.com — the portfolio is a drivable world (three.js r183 verified, WebGPU
context, Howler audio verified at runtime); messenger.abeto.co — toon-outlined 3D town with a
character, dialog boxes in a hand-drawn type, one click advances.

Transfer: let one object answer input physically (pluck, drag, tilt) — not the whole navigation.
For a developer or product audience findability wins; keep content in DOM.

## 12. Archive collage at depth

Observed: landonorris.com — scattered photographs at different sizes and depths with tiny mono
captions and accent tick-bars, drifting at different scroll rates over contour lines.

Build: positioned media with per-item `scrollProgress` → `translate3d` at 2–3 speed tiers;
captions as real text. Requires real photography; skip it otherwise.

---

## Choosing

| Page job                 | Strong signature candidates | Supporting     |
| ------------------------ | --------------------------- | -------------- |
| Studio / portfolio       | 11 (one object), 1, 4       | 3, 5, 6, 8     |
| Product launch           | 7, 4                        | 1, 6, 9        |
| Developer tool / library | interactive specimen (labs) | 1, 2, 3, 8, 10 |
| SaaS marketing           | real product UI as hero     | 3, 6, 8        |
| Personality / athlete    | 12, 1                       | 3, 5, 6        |

## 13. Playable type (the headline is the instrument)

Built for the SNOWBROS site (original): every letter of the hero title is a key. Letters lift toward
a fine pointer (proximity → `translate`), a click/tap plays a note and sends a hammer wave outward
from that letter, and a piano-key strip under the title maps x-position to keys both ways. Rows are
fitted edge-to-edge by measurement, so the title spans the width like a keyboard.

Build: `splitText(title, { by: ['lines', 'words', 'chars'], mask: true })` (accessible copy kept),
`proximity(chars)`, a CSS keyframe on `transform` with `animation-delay: calc(var(--d) * 22ms)` where
`--d` is the distance from the struck letter, and `soundCues` for opt-in notes. Words never break
(`white-space: nowrap` on words). Reduced motion: no split, static title; keyboard Space/Enter plays
a chord. Live code: `website/src/sections/hero-play.ts`.

Use when the brand's idea is play, sound or making; skip on content-first or product pages.
