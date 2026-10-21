# Flagship website brief

Owner brief for `website/` (received 2026-10-21). Start this only after the toolkit is verified,
pushed and published (see `docs/PROGRESS.md`). This file condenses every requirement of the
original brief; nothing below is optional.

## Goal

Build the definitive SNOWBROS Creative Engineering site: a distinctive, award-level experience
(Awwwards/FWA tier) that is also real proof that our own skill and toolkit produce it. Learn from
the documented references (`docs/research/`), never copy them.

## 1. Understand first

- Read `docs/PROGRESS.md`, git state, `skills/snowbros-creative/SKILL.md`, and the real package
  APIs. Know what is complete vs experimental. Never pretend to use the toolkit.
- Missing capability → implement it in the toolkit, or use an established compatible dependency.
- Preserve useful work in `website/`; improve rather than restart.

## 2. Direction — "an interactive digital universe"

- Brand foundation: warm cream/off-white surfaces, black typography, restrained orange accents.
  Evolve creatively without losing recognition.
- Strong editorial type system, dramatic scale/whitespace/density changes, layered depth,
  lighting, subtle grain, precise geometry, original motifs from "creative engineering".
- Contrast quiet refined moments with a few spectacular sequences. Must be memorable with motion
  disabled.
- Banned: purple gradients, glowing orbs, glass-card grids, stock 3D blobs, identical feature
  cards, generic AI-startup look.

## 3. Concept

- Explore a **living creative-engineering instrument**: code, motion, type, interface and 3D space
  as parts of one responsive system. Pick one strong signature (procedural object, kinetic type,
  evolving geometry, interactive canvas…) based on real toolkit capability.
- Visual integrated into composition and narrative — not a 3D object beside a heading.
- Each section reveals another dimension of the system.

## 4. Opening screen

- Art-directed nav, exceptional hero type, meaningful statement, signature visual built with our
  tools, clear route into the toolkit. No long intro blocking interaction.
- Mobile is a reinterpretation, not a shrink.

## 5. Scroll choreography

- One motion language; purposeful pins with sensible durations; type that changes scale/position;
  layered reveals; spatial transitions; restrained parallax; coordinated timelines; micro-interactions.
- No scroll hijacking, no unreadable motion, no high-end-GPU dependence.

## 6. Labs (real, working)

- **A Motion lab** — text reveals, timelines, stagger, scroll sequences; instrument-like controls
  (duration, easing, stagger, direction, intensity).
- **B Interaction lab** — pointer/hover/focus/keyboard/state primitives; nav, buttons, menus,
  feedback; touch + keyboard usable.
- **C 3D / procedural lab** — `@snowbros/scene`: procedural geometry, shaders, camera, light,
  pointer response. Lazy load, cleanup, render limits, fallbacks; no work while hidden.
- **D UI/UX lab** — SaaS dashboard, command/navigation interface, interactive data viz,
  form/onboarding, product showcase, responsive content layout. Working, realistic states.
- **E Creative effects lab** — CSS/SVG/Canvas/WebGL type effects, masks, image transitions,
  cursor-responsive visuals, procedural textures. Reusable by developers.
- **F Live playground** — modify params, presets, preview, reset, view code. No dead controls.

## 7. Toolkit is the star

- Explain how skill, motion libs, interaction primitives, 3D/fx, UI patterns + adapters,
  playground/examples/tooling fit together in real projects.
- Adoption journey: discover → understand via demos → install skill + packages → integrate into
  existing project → contribute.
- Real repo URL, real install commands, verified npm versions only.
- Speak to designers and developers (marketing sites, SaaS, portfolios, dev tools).

## 8. Signature moments

Pick only the strongest few, e.g. a procedural visual evolving across sections; type that becomes
a technical diagram; UI pieces assembling into a system; scene shifting abstract → interface →
spatial; live basic-vs-toolkit comparison; explorable building blocks of an interaction; visuals
responding to input instead of looping. No cursor trails, sound, long loaders or gimmicks.

## 9. Dogfood the skill

Follow the skill workflow (analyze → direction → technique choice → build → a11y/perf audit →
iterate). Improve the skill where it falls short. Extract reusable patterns into packages when
they have real value; avoid both site-only hacks and over-general APIs.

## 10. Technical

Current stack unless evidence says otherwise. Responsive (mobile → large), semantic + keyboard,
reduced motion, efficient scheduling, lazy heavy demos, full lifecycle cleanup, stable on resize
and repeated open/close, fallbacks, controlled bundle, SEO metadata, loading/empty/success/error
states, zero dead links/controls/console errors. No heavy blur/filters/huge textures/always-on loops.

## 11. Copy

Concise editorial copy: design + engineering as one discipline; creative control; reusable tech;
open-source ecosystem; bridge from ambitious idea to production. No "revolutionize/unlock/next-gen".

## 12. OSS quality

Maintainable code, extracted patterns documented and tested, licenses respected, accurate install
docs, reproducible examples, reliable build/deploy, still useful if optional features fail.

## 13. Quality gates

- Visual: every section at desktop + mobile; art-directed, not templated.
- Interaction: every link/button/scene/control; keyboard, touch, resize; interruptible motion.
- Technical: lint, tests, typecheck, build; no console errors/missing assets/leaks; open/close 3D
  repeatedly; reduced motion; a11y.
- Product: skill + libs genuinely used; showcased capabilities exist; onboarding → real repo and
  packages; every public link and command verified.

## 14. Execution

Work in the repo, commit meaningfully, keep PROGRESS.md truthful, decide creatively without asking
for approval, never claim a deployment that did not succeed. (Owner instruction: no parallel agents.)
