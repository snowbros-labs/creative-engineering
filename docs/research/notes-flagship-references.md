# Flagship references — live inspection (2026-10-21)

Inspected with Playwright (Chromium, 1440×900) on 2026-10-21. **Verified** = observed in the live
page (DOM, computed styles, loaded scripts, screenshots). **Inferred** = reasonable reading of what
was observed, not confirmed in source.

## landonorris.com

- Verified: built on Webflow (`window.Webflow`, `website-files.com` CDN) with a custom bundle from
  the studio OFF+BRAND (`lando.itsoffbrand.io/dev-js/lando-by-OFF+BRAND.05.js`); Lenis smooth
  scroll (`window.lenis`); 21 `<canvas>` elements on the home page; page height ≈ 13,600 px.
- Verified: two families — **Mona Sans Variable** (grotesk) and **Brier** (display serif). The
  manifesto mixes them inside one headline: uppercase grotesk with selected words swapped to the
  serif in an accent colour ("REDEFINING limits, fighting for WINS…").
- Verified (screenshots): hero portrait with a helmet rendered as horizontal slices sweeping across
  the face; a light topographic contour-line background; a small "next race" card with a clipped
  corner; dark olive manifesto section with the same contour lines.
- Inferred: the slice/helmet effect and contour lines are canvas/WebGL.
- **Principle for SNOWBROS:** typography with two voices inside one sentence; a single quiet graphic
  motif (contours) that recurs across light and dark sections.

## bruno-simon.com (Folio 2025)

- Verified: a single full-viewport canvas; `getContext('webgpu')` succeeded on it in Chromium
  (WebGPU path); one Vite bundle (`assets/index-*.js`); no DOM text content. Headless screenshots
  time out — the scene is GPU-heavy.
- Verified earlier from the public repo README (see `notes-references.md` §1.3): ordered game loop,
  scripted asset compression, instancing.
- **Principle:** the world answers every input physically. Play is the navigation.
  (Not transferable: the game-world IA for content that must be found quickly.)

## messenger.abeto.co

- Verified: one script (`assets/webgl-*.js`), a tiny-planet scene with ink-outlined, flat-shaded
  ("toon") buildings, a chunky hand-drawn logotype, and a single tactile "BEGIN" button with an
  offset bottom edge (a physical key you press). No canvas was present in the DOM after 8 s
  without interaction (inferred: the canvas mounts after begin / or is in a shadow root).
- **Principle:** ink outlines + flat colour feel handmade and warm; one big, physical button with a
  clear press depth makes the first interaction feel tactile.

## scoutmotor.com vs scoutmotors.com

- Verified: **scoutmotor.com** (no "s") is a domain-for-sale marketplace page (Appraise.net), not
  the automotive brand. The intended reference is almost certainly **scoutmotors.com**.
- Verified (scoutmotors.com): custom families `scout-sans` in regular/medium/**wide**/**semicond**
  widths plus `scout-ibm-plex-mono` for labels; 3 `<video>` and 2 `<canvas>`; warm golden-hour
  cinematic video; floating rounded nav bar split into two segments with a small orange "+" mark
  between them; mono micro-labels ("EST 2022").
- **Principle:** warmth from light and material, not from colour saturation; one type family in
  several widths for hierarchy; mono labels as the engineering voice; a floating, segmented nav.

## Synthesis → what SNOWBROS takes (not copies)

1. **Two voices in one sentence** (Lando): manifesto set in a variable grotesk whose weight responds
   to the reader, with key words in our italic serif.
2. **The world answers input** (Bruno, Abeto): the lattice is strummable; on touch devices a tap
   plucks it — with optional vibration.
3. **Physical controls** (Abeto): buttons with real press depth, spring release and a haptic tick.
4. **Warm light, mono engineering voice, floating segmented nav** (Scout): warm paper and lighting,
   JetBrains Mono labels, a header that becomes a floating pill once you scroll.
5. **One recurring motif** (Lando's contours ↔ our lattice): the crystal reappears as glyphs,
   plotted lines and the system map rather than adding new decorations.

## Second pass (deeper, hands-on)

- **landonorris.com — verified while scrolling:** a scattered photo collage at different depths
  with tiny mono captions ("MONACO, 2023"); an "ON TRACK / OFF TRACK" pair (serif over bold
  grotesk) with a **hand-drawn scribble written over the type** in the accent colour; helmet cards
  framed with notched corners and captions with the year in accent; the contour-line motif runs
  through light and dark sections; Lenis smooth scroll; 4 sticky elements.
- **messenger.abeto.co — verified after pressing BEGIN:** a hand-drawn, wobbly-ink "LOADING"
  envelope — even the loading state is drawn by hand. The 3D world did not initialise in headless
  Chromium (inferred: GPU requirement), so its in-world interaction is not verified here.
- **scoutmotors.com — verified while scrolling:** a giant headline with a **ring of numbered
  archival cards orbiting it**, a thin circle guide and crosshair hairlines, paper grain, one
  line of the headline in orange; later a dark cinematic night video.
- **Applied:** `annotate()` (hand-drawn orange redlines over the words that carry the argument —
  Lando's scribble + Abeto's ink, as an engineer's pen); the Labs index as an orbit of chips around
  the headline on a drafting ellipse (Scout's ring, as a working navigation, not a carousel).
- **Not applied:** Lando's photo collage (we have no photography and won't fake it); Bruno's
  driving world (play as primary navigation hurts findability for a developer product); Scout's
  autoplay video (cost and no footage).
