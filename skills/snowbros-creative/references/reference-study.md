# Reference study — extract principles, never copy

References raise the bar; they are not templates. The output of a study is a short list of
**transferable principles** plus what you will deliberately _not_ take — never a layout to clone.

## Method (30–60 minutes per site)

1. **Visit live**, at 1440 × 900 and 390 × 844. Scroll the whole page, open the menu, hover and
   press controls, resize. First screens lie; the craft is in sections 3–8 and the footer.
2. **Record observations, labelled.** _Verified_ = seen in the page (DOM, computed styles, loaded
   scripts, screenshots). _Inferred_ = your reading of it. Never present an inference about how
   something is built as fact.
   Useful probes (browser console or automation):

   ```js
   [...new Set([...document.querySelectorAll('h1,h2,p,a,button')].map(e => getComputedStyle(e).fontFamily))]
   document.querySelectorAll('canvas, video').length
   [...document.scripts].map(s => s.src).filter(Boolean)
   ({ lenis: !!window.lenis, gsap: !!window.gsap })
   ```
3. **Fill the inventory** (one line each):
   - Idea — what is the one thing a visitor remembers?
   - Type — families, how many voices, scale contrast, where the display face is used.
   - Composition — grid, asymmetry, what breaks the grid and why.
   - Colour & light — how many colours really; where the accent appears; how warmth/depth is made.
   - Motif — the recurring graphic element, and where it reappears.
   - Motion — what moves, what triggers it, durations/easing feel, what stays still.
   - Interaction — what answers input, and how (press depth, physics, sound, haptics).
   - Navigation — shape, states, behaviour on scroll, mobile form.
   - Phone composition — what changed vs desktop (not only "it stacks").
   - Cost & fallback — canvases, video, bundle, what happens without WebGL / with reduced motion.
4. **Extract principles**: rewrite each strong observation as a rule that would work for a
   different brand. "Two typographic voices inside one sentence" transfers; "Brier serif in lime
   green" does not.
5. **Transfer test** — for each principle, write how it would look in _this_ project's identity and
   content. If you can only imagine it looking like the reference, drop it.
6. **Write the "not taking" list** with reasons (no footage, hurts findability, too heavy for the
   audience's devices…).

## Deliverable

```
Reference: <site> (inspected <date>, <viewports>)
Verified:  <3–6 bullets>
Inferred:  <1–3 bullets>
Principles: <2–4 rules, brand-neutral>
Applied as: <how each becomes ours>
Not taking: <what and why>
```

## Principles that recur across award-level sites

Collected from live studies of landonorris.com, bruno-simon.com, messenger.abeto.co and
scoutmotors.com (details and evidence: `docs/research/notes-flagship-references.md` in the
SNOWBROS repository). Use them as prompts, not rules.
- **One idea, many expressions.** A single motif (contour lines, a crystal, ink outlines) recurs in
  hero, sections, loading states and the footer instead of new decoration per section.
- **Two voices.** Contrast of typographic voice (serif/grotesk, wide/condensed, mono labels) carries
  hierarchy and personality more than colour does.
- **The world answers input.** At least one element responds physically — press depth, springs,
  plucking, dragging — so the page feels made, not printed.
- **Warmth from light and material,** not saturation: golden light, paper grain, ink, shadow.
- **Restraint around the signature.** Everything near the signature moment is quiet; the accent
  colour appears rarely and therefore means something.
- **Hand-made marks on engineered layouts** — a scribble, an ink outline, a drawn underline over
  precise type.
- **Phones get their own composition**: one focal point, text in a protected zone, a single primary
  control in thumb reach, navigation reduced to one or two targets.
- **Finish everywhere**: the loading state, the 404, the footer and the menu are designed with the
  same care as the hero.

## Anti-patterns when studying

- Copying a reference's layout, illustration, motion signature or copy structure.
- Judging from screenshots or videos of the site instead of the live page.
- Claiming implementation details (e.g. "uses GSAP ScrollTrigger") without evidence.
- Studying only desktop.
