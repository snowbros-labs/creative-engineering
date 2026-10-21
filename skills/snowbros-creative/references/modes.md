# Modes

Modes set emphasis, not separate processes. All modes still follow the operating loop.

## Research

- **Trigger:** "look at these sites", "what are competitors doing", unfamiliar codebase.
- **Do:** inspect live pages (browser + network panel), case studies, docs. Label every claim: OBSERVED, VERIFIED (code/network evidence with URL), INFERRED (why), UNKNOWN.
- **Output:** findings table: reference → technique → evidence → transferable lesson → do-not-copy.
- **Never:** claim a site uses a library because it "looks like" it.

## Concept

- **Trigger:** new page/product, redesign, "make it award-worthy".
- **Do:** three directions that differ in _idea_, not just color (see [design-direction.md](design-direction.md)). For each: one-line idea, type, color, layout principle, motion signature, risk, cost. Recommend one.
- **Output:** concept sheet; optionally a static prototype of the signature moment.

## Build

- **Trigger:** approved direction, concrete feature request.
- **Do:** follow the plan; project conventions; smallest diff.
- **Output:** working code + verification report.

## Motion

- **Trigger:** animation, transitions, scroll storytelling, micro-interactions.
- **Do:** for each motion answer: what does it communicate? what triggers it? can it be interrupted? what happens under reduced motion? what cleans it up? Use tokens from [motion-system.md](motion-system.md).
- **Output:** motion spec table (element, trigger, property, duration, easing, reduced policy) + code.

## SaaS

- **Trigger:** dashboards, admin, tables, forms, settings, onboarding, developer tools.
- **Do:** task speed first. Information hierarchy, density, keyboard paths, states (empty/loading/error/success), feedback < 100 ms. Motion is functional only, except rare milestones.
- **Load:** [patterns/saas-patterns.md](patterns/saas-patterns.md), [patterns/feedback-states.md](patterns/feedback-states.md).

## Immersive

- **Trigger:** 3D, WebGL, shaders, cinematic scroll, product launches.
- **Do:** justify 3D (does depth/interaction explain something?). Budget assets before modelling. Fallback first, then enhance. Lazy-load the renderer after content.
- **Load:** [patterns/three-d.md](patterns/three-d.md), [patterns/procedural.md](patterns/procedural.md), [performance.md](performance.md).

## Audit

- **Trigger:** "review this UI", pre-release gate.
- **Do:** run scripts, inspect in browser, score with [audit-checklist.md](audit-checklist.md). Every finding: location, evidence, impact, fix, effort.
- **Output:** scored report, ranked fixes. Do not fix during an audit unless asked.

## Refactor

- **Trigger:** "improve this existing page/app".
- **Do:** baseline (screenshots + audit), improve via tokens/primitives, preserve behavior and APIs. See Refactor rules in [workflow.md](workflow.md).

## Cross-framework

- **Trigger:** "do this in Vue/Flutter/SwiftUI", porting a pattern.
- **Do:** translate _intent and contract_ (trigger, progress, timing, reduced-motion, cleanup), not code. Use the platform mapping tables in `platforms/`. Mark what does not translate.

## Common combinations

| Request                                  | Modes                                                          |
| ---------------------------------------- | -------------------------------------------------------------- |
| "Make our landing page award-worthy"     | Research → Concept → Build + Motion (+ Immersive if justified) |
| "Our dashboard feels clunky"             | Audit → Refactor + SaaS (+ Motion, functional only)            |
| "Add a 3D hero"                          | Immersive + Motion + Build                                     |
| "Port this React interaction to SwiftUI" | Cross-framework + Motion                                       |
| "Review before launch"                   | Audit                                                          |
