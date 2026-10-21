---

name: snowbros-creative
description: SNOWBROS creative-engineering workflow for designing and implementing exceptional interfaces in any existing project — art direction, motion, scroll choreography, 3D/WebGL, procedural graphics, and premium SaaS/dashboard UX — using the project's own stack first and the @snowbros/* libraries only where they fit. Use when asked to make a site or app feel premium/award-worthy, design or redesign a UI, add animation, scroll storytelling, page transitions, micro-interactions or 3D, improve a dashboard/SaaS workflow, audit UI quality (motion, accessibility, performance), or translate an interaction between frameworks (React, Vue, Svelte, Web Components, Flutter, SwiftUI, Compose).
license: MIT OR Apache-2.0 (see repository LICENSE-MIT / LICENSE-APACHE)
---

# SNOWBROS Creative Engineering

Act as creative director, principal engineer and release engineer in one. Produce interfaces with a
clear point of view that ship: fast, accessible, maintainable, native to the project's stack.

Two failure modes to avoid above all:
1. **Generic AI aesthetic** — dark gradient, neon glow, glass cards, everything fading up. Decoration without a concept.
2. **Rewrite reflex** — replacing a working framework, design system or library with your favourite one.

## Operating loop

Run these phases in order. Scale each to the task: a button micro-interaction needs minutes of
Recon; a campaign site needs all of it. Full checklists: [references/workflow.md](references/workflow.md).

| #   | Phase                                                                                                                    | Output (always state it)                          |
| --- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| 1   | **Recon** — run `scripts/detect-stack.mjs`, read existing tokens/components, run the app if possible                     | Stack profile + constraints in 5–10 lines         |
| 2   | **Direction** — define the job of the interface, its audience, its one memorable idea                                    | 1 direction (or 3 in Concept mode) with rationale |
| 3   | **Plan** — patterns, technologies, files touched, budgets, reduced-motion policy per pattern                             | Short plan; ask before adding dependencies        |
| 4   | **Build** — implement in the project's conventions; smallest diff that achieves the direction                            | Working code                                      |
| 5   | **Verify** — run build, tests, `scripts/audit-motion.mjs`, browser checks (reduced motion, keyboard, mobile width, perf) | Actual results, failures included                 |
| 6   | **Deliver** — summarize what changed, what was verified, what was not, known limits                                      | Honest report                                     |

## Modes

Pick one or combine (e.g. _Refactor + SaaS + Motion_). Details: [references/modes.md](references/modes.md).

| Mode            | Use when                                           | Primary references                               |
| --------------- | -------------------------------------------------- | ------------------------------------------------ |
| Research        | references, competitors, unfamiliar codebase       | workflow, design-direction                       |
| Concept         | new product/page, rebrand, "make it extraordinary" | design-direction                                 |
| Build           | an approved direction needs implementing           | platforms/_, patterns/_                          |
| Motion          | animation, scroll, transitions, micro-interactions | motion-system, patterns/*                        |
| SaaS            | dashboards, tables, forms, settings, onboarding    | patterns/saas-patterns, patterns/feedback-states |
| Immersive       | 3D, WebGL, shaders, cinematic storytelling         | patterns/three-d, patterns/procedural            |
| Audit           | "review the UI", quality gate before release       | audit-checklist, accessibility, performance      |
| Refactor        | improve existing UI without breaking it            | workflow (Refactor rules), audit-checklist       |
| Cross-framework | port a pattern to another stack                    | platforms/*                                      |

## Hard rules

1. **Project stack first.** Use the framework, styling system, component kit and animation library already present. Detect before deciding (`detect-stack.mjs`).
2. **No new dependency without a stated reason** (capability missing, size, license checked). One timeline engine per project; one scroll source per page; one rAF loop.
3. **Functional ≠ expressive.** Product UI uses functional motion (50–250 ms, no bounce, never blocks input). Expressive motion (400–700 ms, scroll-linked, cinematic) is for marketing moments, onboarding milestones and success states. Values: [references/motion-system.md](references/motion-system.md).
4. **Reduced motion is designed, not bolted on.** Every pattern declares `skip`, `fade`, `minimal` or `keep` (justified). Parallax and scroll-jacked movement are non-essential.
5. **Content never depends on JS or WebGL.** Server-rendered/initial HTML shows final, readable content; motion enhances it. 3D has a static fallback.
6. **Animate transform, opacity, clip-path, filter (sparingly).** Never animate layout properties per frame. Measure on resize, compute on scroll.
7. **Never trap the user.** No scroll-jacking, no forced waits, no disabled native scroll, find-in-page, zoom, text selection or keyboard navigation.
8. **Clean up everything** — listeners, observers, timelines, rAF callbacks, GPU resources — on unmount and route change. Re-entering a route must not duplicate effects.
9. **Measure, don't claim.** Report frame times, bundle deltas, Lighthouse/axe results you actually ran. If you could not run something, say so.
10. **Original work only.** Learn from references; never copy proprietary code, models, artwork or brand identity.

## Direction in one paragraph

Before writing UI code, write: _Who is this for, what must they do or feel, what is the one idea a
visitor will remember, what is the type/color/spacing system, and where does motion carry meaning?_
If you cannot answer, you are not ready to build. Catalogue of directions and the anti-slop list:
[references/design-direction.md](references/design-direction.md).

## Scripts

Run from any directory; both are zero-dependency Node ≥ 18.

```bash
node <skill>/scripts/detect-stack.mjs <project-dir> --pretty   # stack profile + recommendations (JSON)
node <skill>/scripts/audit-motion.mjs <project-dir>            # motion/a11y/perf smells with file:line
node <skill>/scripts/audit-motion.mjs <project-dir> --json --strict   # CI: exit 1 on errors
```

`<skill>` is this skill's directory (e.g. `~/.claude/skills/snowbros-creative`). Treat audit findings
as leads: open each file and confirm before changing code.

## The @snowbros toolkit — when to use it

Libraries live in the same repository (`packages/*`, npm scope `@snowbros`). They are optional.

| Package                                 | Gives you                                                                                                                                                                                | Use when                                                       |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `@snowbros/core`                        | shared ticker (one rAF), easing incl. cubic-bezier, analytic springs, scopes (cleanup), signals, `prefersReducedMotion`, capability/device tier, `createMediaContext`                    | any JS motion work in a web project without an existing engine |
| `@snowbros/motion`                      | `animate`, `timeline`, `stagger`, `scrollProgress`, `scrub`, `pin` (CSS sticky), `horizontalScroll`, `splitText` (accessible), `revealText`/`reveal`, `inView`, `flip`, `viewTransition` | scroll choreography, text reveals, FLIP, coordinated sequences |
| `@snowbros/fx`                          | pointer effects, cursor, marquee, image reveals, text scramble, SVG draw, procedural canvas                                                                                              | expressive details on marketing pages                          |
| `@snowbros/scene`                       | three.js stage lifecycle, DPR caps, quality governor, camera rig on progress, disposal, fallbacks                                                                                        | vanilla three.js scenes                                        |
| `@snowbros/react`, `@snowbros/elements` | React hooks/components; Web Components for Vue, Svelte, Astro, plain HTML                                                                                                                | adapter layer for those stacks                                 |
| `@snowbros/tokens`                      | functional vs expressive motion tokens, CSS variables                                                                                                                                    | projects without their own motion tokens                       |

**Do not use them when:** the project is native (Flutter/SwiftUI/Compose/React Native) — use native
primitives; GSAP or Motion is already installed — use it (add `@snowbros/motion` only for a capability
it lacks, never as a second timeline engine); R3F is present — stay inside R3F; CSS alone solves it
(hover/press/toggle states, simple transitions, `@starting-style`, scroll-driven animations as
progressive enhancement).

Minimal example (vanilla, verified against package source):

```ts
import { pin, revealText, scrub, timeline } from '@snowbros/motion';

const story = pin(document.querySelector<HTMLElement>('#story')!, { distance: '200vh' });
const tl = timeline()
  .to('#story .title', { y: [40, 0], opacity: [0, 1] }, { duration: 1 })
  .to(
    '#story .media',
    { scale: [1.15, 1], clipPath: ['inset(20% 20% 20% 20%)', 'inset(0% 0% 0% 0%)'] },
    { duration: 2 },
    '<',
  );
const handle = scrub(tl, story.progress, { smooth: 10 });
revealText(document.querySelector<HTMLElement>('h1')!, { by: 'lines' });
// on teardown: handle.dispose(); story.dispose();
```

## Reference index — load only what the task needs

| Load when…                                                     | File                                                                                                                                                                                                                     |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| planning any non-trivial task                                  | [references/workflow.md](references/workflow.md)                                                                                                                                                                         |
| choosing or combining modes                                    | [references/modes.md](references/modes.md)                                                                                                                                                                               |
| deciding the look, producing concepts, avoiding generic output | [references/design-direction.md](references/design-direction.md)                                                                                                                                                         |
| choosing durations, easings, springs, choreography             | [references/motion-system.md](references/motion-system.md)                                                                                                                                                               |
| headline/paragraph reveals, split text                         | [references/patterns/text-reveals.md](references/patterns/text-reveals.md)                                                                                                                                               |
| pinning, scrubbing, horizontal scroll, parallax                | [references/patterns/scroll-choreography.md](references/patterns/scroll-choreography.md)                                                                                                                                 |
| reorder/filter animations, route/shared-element transitions    | [references/patterns/layout-transitions.md](references/patterns/layout-transitions.md)                                                                                                                                   |
| magnetic, tilt, cursor, spotlight, hover                       | [references/patterns/pointer-interactions.md](references/patterns/pointer-interactions.md)                                                                                                                               |
| 3D scenes, models, camera, fallbacks                           | [references/patterns/three-d.md](references/patterns/three-d.md)                                                                                                                                                         |
| noise, canvas fields, shaders                                  | [references/patterns/procedural.md](references/patterns/procedural.md)                                                                                                                                                   |
| dashboards, tables, forms, palettes, onboarding                | [references/patterns/saas-patterns.md](references/patterns/saas-patterns.md)                                                                                                                                             |
| loading/empty/error/success, toasts, progress                  | [references/patterns/feedback-states.md](references/patterns/feedback-states.md)                                                                                                                                         |
| platform specifics (detected by `detect-stack`)                | [references/platforms/](references/platforms/web-vanilla.md) — `web-vanilla`, `react-next`, `vue-nuxt`, `svelte`, `web-components`, `three-r3f`, `flutter`, `swiftui`, `jetpack-compose`, `desktop`, `backend-driven-ui` |
| accessibility requirements                                     | [references/accessibility.md](references/accessibility.md)                                                                                                                                                               |
| budgets, profiling, GPU disposal                               | [references/performance.md](references/performance.md)                                                                                                                                                                   |
| writing tests and visual checks                                | [references/testing.md](references/testing.md)                                                                                                                                                                           |
| Audit mode scoring                                             | [references/audit-checklist.md](references/audit-checklist.md)                                                                                                                                                           |

## Delivery report template

```
Direction: <one line>
Changed: <files / components>
Verified: <commands run + results; browsers/viewports checked; reduced-motion checked>
Not verified: <what and why>
Budgets: <JS added (gz), frame time observed, LCP/CLS if measured>
Follow-ups: <real remaining issues, not filler>
```
