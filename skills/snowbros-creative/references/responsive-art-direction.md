# Responsive art direction — recompose, don't shrink

A phone is not a small desktop. It is a tall, narrow frame held in one hand, read in short
bursts, scrolled with a thumb. Scaling the desktop composition down produces the classic failure:
decoration that crowds the headline, three-column ideas in one cramped column, actions out of
reach. Design each composition on purpose, from the same system.

## Decide per section, before writing CSS

For every section write one line per breakpoint band:

```
Hero — desktop: type left, crystal right, overlapping by design (contrast checked)
       tablet:  crystal as a wide figure above, headline full width below
       phone:   eyebrow → framed figure (crystal cropped off the right edge) → headline → lede → 2 actions in thumb zone
```

If the phone line says "same, smaller", you have not decided yet.

## Composition moves (pick, don't stack)

| Move                                   | Use when                                                | How                                                                                                     |
| -------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Zone split**                         | A visual and a headline compete for one frame           | Give each a band: visual zone above, text zone below. No layer crosses into the text zone               |
| **Figure plate**                       | A signature visual must stay prominent but not dominate | Put it in a framed, captioned plate of fixed proportion (`clamp(…, 34svh, …)`), crop it on one edge     |
| **Crop, don't scale**                  | A centred illustration becomes tiny or crowds           | Keep it large and push it partly off an edge — the crop reads as intent and preserves detail            |
| **Protected text area**                | A full-bleed visual must stay behind the type           | Gradient or solid scrim under the text block only; verify contrast on the brightest pixel               |
| **Stack deck**                         | A list of equal cards becomes a long scroll             | `position: sticky` cards with increasing `top` so they deal onto each other; pure CSS, works without JS |
| **Reflow to rows**                     | Multi-column labelled data (principles, specs)          | Each item becomes a two-column row: label left, value right                                             |
| **Hide the diagram, keep the meaning** | Connector lines, orbits, callouts that need width       | Drop the decoration; keep the state it expressed (highlight, order, grouping)                           |
| **Thumb-zone actions**                 | Primary CTAs on phones                                  | Bottom of the first viewport, full-width grid of equal buttons (stack below ~360 px)                    |
| **Logotype re-set**                    | A wide wordmark/headline                                | Re-set it (stack lines, change width axis) or fit it to the column with measured sizing                 |

Observed in the references at 390 px (live, 2026-10-22): landonorris.com reduces navigation to
two square buttons and re-centres the hero around one portrait with a single control in the
bottom-right thumb zone; scoutmotors.com keeps its segmented floating nav and puts the headline in
a protected band at the bottom of a full-bleed image; messenger.abeto.co re-sets its logotype as
stacked blocks filling the width with one large tactile button below. Common principle: **one
focal point per phone viewport, text in its own zone, one primary control within thumb reach.**

## Type across sizes

- Size display type so the **longest word** fits at 320 px (`clamp(min, vw, max)` — the min is a
  real constraint, not decoration). Check "engineering,"-length words, not the average.
- Reduce body copy length on phones only by editing it everywhere (one message), never by hiding
  sentences on small screens.
- Labels/eyebrows: one line on phones. If two labels don't fit at 320 px, drop the less important
  one there (it must not carry unique information).
- Wordmarks and giant type: fit to the container by measurement (`fontSize = box / naturalWidth`),
  not by guessing `vw` — scrollbars and gutters make `vw` overflow.

## Layout mechanics that prevent most breakage

- Grid tracks: `minmax(0, 1fr)`, never bare `1fr` next to measured content.
- Flex/grid children holding text: `min-width: 0`.
- Code, URLs, package names: `overflow-wrap: anywhere` or `pre-wrap`.
- Heights: `svh` for "fits the visible screen", `dvh` only when you want it to change with
  browser chrome; never `vh` for pinned or full-screen layouts on phones.
- Safe areas: `viewport-fit=cover` + `env(safe-area-inset-*)` on fixed headers, footers, menus.
- Fixed/sticky chrome must leave with the header or be part of it — floating labels that stay
  behind when the header hides are a common defect.

## Interaction across input types

| Desktop (fine pointer)          | Phone (coarse pointer)                                                |
| ------------------------------- | --------------------------------------------------------------------- |
| hover reveals                   | always visible, or revealed by tap with a visible affordance          |
| cursor-follow, magnetic, tilt   | off (`(hover: hover) and (pointer: fine)` gate)                       |
| strum / drag across an object   | tap to pluck; drag only with `touch-action: pan-y` so scroll survives |
| pinned multi-step scroll scenes | unpinned flow, or a short scrubbed exit; never long scroll-jacking    |
| right-rail captions             | captions inside the figure, below the image                           |

Say the touch alternative in the UI ("Tap to pluck"), switched by media query, not by user agent.

## Performance on phones

- Mount 3D only where it is the point, cap DPR (1.5 on mid-tier), render on demand.
- One scroll source, one rAF loop, and a loop that sleeps when idle (measure it, see visual-qa.md).
- Lazy-load heavy libraries after first paint (`requestIdleCallback` + dynamic `import()`).
