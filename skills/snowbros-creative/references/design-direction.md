# Design direction

A direction is an _idea_ expressed through a system: type, color, space, composition, imagery,
motion. It is not a color palette and not a list of effects.

## Producing three genuinely different directions (Concept mode)

Vary the **idea** axis, not just the surface. Good triads differ on at least three of:

| Axis        | Pole A                       | Pole B                             |
| ----------- | ---------------------------- | ---------------------------------- |
| Voice       | quiet, precise               | loud, declarative                  |
| Density     | generous whitespace          | information-rich                   |
| Type        | single grotesk, tight scale  | serif/display contrast, wide scale |
| Color       | near-monochrome + one accent | saturated, material color          |
| Composition | strict grid, alignment       | asymmetric, overlapping layers     |
| Imagery     | product UI/real data         | photography, 3D, illustration      |
| Motion      | functional, almost invisible | signature, scroll-authored         |

For each direction write:
```
Name — one-line idea ("The product is the hero: real UI, no illustration.")
Type: <families, scale ratio, weights>   Color: <roles + values>   Grid: <columns, max width, rhythm>
Signature moment: <the one thing people remember>
Motion: <functional/expressive mix, signature pattern>
Fits because: <audience/job>   Risk: <what could go wrong>   Cost: <effort, perf weight>
```
Then recommend one and say why the others lose.

## Direction catalogue

| Direction                  | Idea                                                                                                                    | Use when                                                                | Avoid when                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Editorial**              | Typography carries the story; big serif/sans contrast, long-form rhythm, image crops with intent                        | brands with narrative, studios, publications, launches with a manifesto | dense tools, short-attention flows                                            |
| **Engineered minimal**     | Precision as aesthetic: one grotesk, strict 4/8 px grid, hairlines, monochrome + one accent, real product UI as imagery | developer tools, infra, B2B SaaS marketing, docs                        | consumer brands needing warmth                                                |
| **Cinematic immersive**    | A guided sequence: pinned scenes, 3D/video, camera moves, sound optional                                                | product reveals, campaigns, portfolios, physical products               | frequent-use pages, SEO-critical content, low-end audiences without fallbacks |
| **Data-dense calm**        | Density with hierarchy: tabular numerals, neutral chrome, color reserved for status/data, keyboard-first                | dashboards, admin, analytics, trading, ops                              | marketing heroes                                                              |
| **Playful tactile**        | Physicality: springs, squash, drag, sticker-like shapes, bold color                                                     | consumer apps, education, community, games-adjacent                     | regulated/financial/medical trust contexts                                    |
| **Documentary / archival** | Evidence-led: footnotes, timelines, maps, captions, primary sources                                                     | storytelling, reports, data journalism                                  | sales pages needing a fast CTA                                                |
| **Brutal utility**         | Raw HTML energy: system fonts, visible structure, zero decoration, speed as brand                                       | indie tools, manifestos, internal tools                                 | luxury, premium consumer                                                      |

Combine sparingly: e.g. _Engineered minimal_ site with one _Cinematic_ product-reveal section.

## Anti-slop list (reject on sight)

- Purple/blue gradient hero on near-black with a glowing orb.
- Glassmorphism cards everywhere; blur behind text that has no layer reason.
- Neon glows, drop shadows on every card, gradient text on body copy.
- "Bento grid" of identical cards each with an icon + 2-line blurb.
- Every section fades up 20px on scroll with the same timing.
- Fake dashboards with lorem metrics; fake logos; fake testimonials.
- Emoji as icons; three-icon "feature" rows; generic 3D blobs.
- Centered everything; uniform 64px gaps; one font weight.
- Animations that delay reading (text hidden until a 1.2 s stagger finishes).
- Custom cursor that hides the native cursor on a text-heavy page.

## Typography

- Max two families (plus mono for code/data). Pair by contrast (serif display + grotesk text) or use one superfamily.
- Scale: pick a ratio and stick to it — 1.2 (product UI), 1.25–1.333 (marketing), 1.5+ (editorial display). Use `clamp()` for fluid display sizes, e.g. `font-size: clamp(2.5rem, 1rem + 6vw, 7rem)`.
- Body 16–18 px, line-height 1.5–1.65, measure 60–75 characters. Display line-height 0.9–1.1; tighten tracking (−0.01 to −0.04em) on large sizes.
- Tabular numerals (`font-variant-numeric: tabular-nums`) for any changing number or table.
- Self-host fonts, `font-display: swap`, subset, preload the one above-the-fold weight. Size-adjust fallbacks to avoid CLS.

## Composition

- Use a real grid (12 columns desktop, 4–6 mobile) and break it on purpose, not by accident.
- One focal point per viewport. Scale contrast creates hierarchy faster than color.
- Rhythm: spacing scale (4/8 based); larger gaps separate ideas, smaller gaps group them.
- Let product UI, data or real photography be the imagery whenever the product is visual.

## Color

- Define **roles**, not swatches: background, surface, text, muted text, border, accent, focus, success/warning/danger, data series.
- Generate from few inputs in a perceptual space (OKLCH): base hue, accent hue, contrast level. Derive light/dark from the same roles.
- Contrast: body text ≥ 4.5:1, large text and UI boundaries ≥ 3:1 (WCAG 2.2 AA).
- Accent budget: in product UI the accent marks interactive/primary only; status colors never decorative.

## Motion as part of the direction

Write the motion signature in one line: "Lines rise from masks, nothing else moves until you scroll"
or "Nothing animates except state changes, which take 150 ms." Then apply
[motion-system.md](motion-system.md).
