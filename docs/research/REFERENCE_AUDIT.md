# Reference audit

Consolidated research behind SNOWBROS Creative Engineering. Inspected **2026-10-21**.
Detailed evidence lives in two companion files; this document is the index and the decisions they drove.

| File                                                   | Contents                                                                                                                                                                                                                     |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`notes-live-inspection.md`](notes-live-inspection.md) | Live browser inspection (Playwright, Chromium) of cvnt.in, landonorris.com, messenger.abeto.co, theatrejs.com — bundles, globals, network assets, scroll behaviour, 1440 px and 390 px screenshots in [`screens/`](screens/) |
| [`notes-references.md`](notes-references.md)           | 20 references across 8 categories, 14 principles, cited motion-token values                                                                                                                                                  |
| [`TECHNOLOGY_EVALUATION.md`](TECHNOLOGY_EVALUATION.md) | Library/tool comparison with `npm view` data, licenses and recommendations                                                                                                                                                   |

## Evidence labels

Every claim in the companion files carries one of:
- **OBSERVED** — behaviour seen in a real browser session.
- **VERIFIED** — code or network evidence (bundle string, global, request URL), cited.
- **INFERRED** — reasoned conclusion, with the reasoning stated.
- **UNKNOWN** — could not be determined; no guess recorded as fact.

Sources that could not be read are listed as such (reuters.com and bbc.co.uk blocked fetching; Material 3
and thefwa.com returned only titles — substitutes are named in the notes). Items written from memory
are labelled "memory-only" and were not used to justify decisions.

## Primary reference: cvnt.in (VERIFIED unless noted)

| Aspect       | Finding                                                                                                                                                          |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework    | Next.js App Router, Tailwind + CSS Modules, `next/font`                                                                                                          |
| 3D           | Hand-rolled three.js r171 (`__THREE__ = "171"`, canvases tagged `data-engine="three.js r171"`), no R3F; lazy-loaded ≈3.9 s after first paint                     |
| Hero         | `Points` cloud (950 particles); low tier lowers DPR and caps at 36 fps; respects `prefers-reduced-motion`; pauses in hidden tabs                                 |
| Product      | One `packaging.glb` (≈515 KB), procedural studio environment (no HDR), drag-to-spin with damped inertia + idle auto-spin, offscreen pause, context-loss recovery |
| Device tiers | From `deviceMemory`, `hardwareConcurrency`, viewport width → antialias, power preference, DPR cap, texture set                                                   |
| Scroll       | Native scroll (no Lenis/Locomotive); pinning via CSS `position: sticky` in 360–420vh sections; one passive listener → rAF → 0..1 progress → eased → `transform`  |
| Motion libs  | GSAP 3.14.2 loaded; ScrollTrigger confirmed only on other routes (INFERRED: shared chunk)                                                                        |
| A11y         | Global reduced-motion reset + ~30 component rules                                                                                                                |
| Source maps  | Not public (404)                                                                                                                                                 |

## Cross-site summary

| Site               | Framework               | 3D                  | Scroll                       | Motion                   | Notable assets                            |
| ------------------ | ----------------------- | ------------------- | ---------------------------- | ------------------------ | ----------------------------------------- |
| cvnt.in            | Next.js + Tailwind      | vanilla three r171  | native + sticky + custom rAF | GSAP 3.14.2              | 1 GLB, procedural env                     |
| landonorris.com    | Webflow + agency bundle | three r174          | Lenis 1.1.20 + ScrollTrigger | GSAP 3.13, Rive, Taxi.js | 3 GLB (Draco), 2 HDR, MSDF text, 8 `.riv` |
| messenger.abeto.co | Vite + Svelte 5         | three r180, workers | n/a (game)                   | —                        | Draco, KTX2, audio, WebSocket             |
| theatrejs.com      | Next.js Pages           | none on landing     | native                       | —                        | Mux HLS video                             |

## Broader references (by category)

1. **Immersive 3D/WebGL** — Igloo Inc., Lusion, Bruno Simon Folio 2025.
2. **SaaS & dashboards** — Linear, Vercel dashboard, Raycast.
3. **Editorial/minimal** — Stripe Press, Rauno Freiberg's interaction essay, Wikipedia Vector 2022.
4. **Developer tools & docs** — Stripe Docs (Markdoc), Tailwind docs, Motion docs / Theatre.js.
5. **Configurators & commerce** — Demodern smart configurator, PureDrive-RT, Apple Store buy flow (memory-only).
6. **Storytelling & data viz** — The Pudding, Reuters Graphics, Our World in Data Grapher.
7. **Accessible, fast, content-heavy** — GOV.UK, BBC GEL, Wikipedia.
8. **Design systems & authoring** — Radix Primitives, Material 3 motion, Rive, Apple HIG + IBM Carbon motion.

Per-reference IA, techniques, stack evidence, what not to copy and SaaS transfer: see `notes-references.md`.

## Principles distilled (supporting references in the notes)

1. Motion encodes causality. 2. Frequency sets the motion budget. 3. Interruptible beats choreographed.
2. One clock per page. 5. State is the contract between logic and motion. 6. Spatial continuity across
   routes, with focus following. 7. Density with hierarchy. 8. Generate themes from few perceptual inputs.
3. Progressive enhancement. 10. Reduced motion is a product feature. 11. Budget performance before
   visuals. 12. Content separate from code, checked in CI. 13. Docs are an application.
4. Separate showcase from workspace (expressive vs productive).

## Decisions these findings drove

| Finding                                                                            | Decision in the toolkit                                                                                                            |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Award-level sites run on native scroll + sticky + one listener (cvnt.in)           | `@snowbros/motion` `pin()` uses CSS sticky; `scrollProgress` shares one passive listener per container and measures only on resize |
| One clock per page (Bruno Simon, Igloo)                                            | `@snowbros/core` `ticker`: single rAF with priorities; adapters let Lenis/GSAP drive it instead of adding loops                    |
| Device tiers, DPR caps, fps caps, offscreen pause, context-loss recovery (cvnt.in) | `@snowbros/scene` `createStage`, `createQualityGovernor`, `deviceTier()`                                                           |
| Procedural environment instead of HDR (cvnt.in)                                    | `createStudioEnvironment` (RoomEnvironment + PMREM)                                                                                |
| Productive vs expressive motion (Carbon, Material 3)                               | `@snowbros/tokens` `motion.functional` / `motion.expressive`; skill hard rule 3                                                    |
| Reduced motion as a feature (WCAG 2.3.3, The Pudding toggle)                       | Per-pattern `ReducedMotionPolicy`, `setMotionPreference()` for in-app toggles, `reduced-motion` media keyword                      |
| `data-state` as the logic/motion contract (Radix, Rive)                            | Web Components publish `--sb-progress` and events; styling stays in CSS                                                            |
| GSAP license is not OSI; Theatre Studio is AGPL                                    | Never imported/bundled; structural-type adapters only                                                                              |

## Uncertainties

- Firefox WebGPU status conflicts between caniuse and release-note coverage — re-check before claiming support.
- Abeto gameplay and mobile flow not inspected (stopped at loading screen).
- landonorris.com asset sizes unreadable cross-origin.
- The homepage use of GSAP on cvnt.in is inferred to be incidental.
