# Build progress log

Running log so any contributor (or an AI session resuming after a context reset) can see where the
build stands. Newest entries last. Only record what was actually run/verified.

## 2026-10-21

- Workspace was empty. Created pnpm monorepo (`packages/*`, `apps/*`, `examples/*`), TS 7.0.2,
  Vitest 5 + happy-dom, Biome 2.6.
- Research agents launched (live inspection of CVNT & others, reference audit, technology evaluation)
  → outputs land in `docs/research/`.
- `@snowbros/core` implemented: math, easing (cubic-bezier solver, presets, `toCssLinear`), analytic
  springs + interactive spring values, shared priority ticker (single rAF, sleeps when idle/hidden,
  external clock), lifecycle scopes, signals, env/capability/device-tier detection, media contexts
  with `reduced-motion`/`full-motion` keywords, interaction contract types.
  - Verified: `vitest run` → 23/23 pass; `tsc --noEmit` clean; `tsc -p tsconfig.build.json` emits dist.
- Research complete: `docs/research/notes-live-inspection.md` (CVNT: Next.js + hand-rolled three r171,
  CSS sticky pinning, one passive scroll listener → eased progress → transforms, device tiers, no
  Lenis), `notes-references.md` (20 refs, 14 principles, cited motion tokens),
  `TECHNOLOGY_EVALUATION.md` (dependency-free core + optional-peer adapters; GSAP non-OSI license →
  isolate; Theatre Studio AGPL → never bundle; three peer >=0.159).
- Build tool decision: plain `tsc` (TS 7.0.2) emits ESM + d.ts — verified working; avoids 0.x bundler.
- `@snowbros/motion` implemented: value interpolation (units/colors/complex strings), transform
  component cache, `animate`/`timeline` (labels, relative positions, callbacks, repeat/yoyo,
  reduced-motion policies), `stagger` (center/grid/random), `scrollProgress` (cached layout, one
  listener per container), `scrub` (optional damping), `scrollVelocity`, `pin` (CSS sticky),
  `horizontalScroll`, accessible `splitText`, `inView`, `flip` (WAAPI), `viewTransition`,
  `reveal`/`revealText` presets.
  - Verified: 41/41 unit tests pass (core + motion). Bug found+fixed by tests: scroll container
    started `dirty: true` so first scroll never flushed.
- Skeleton packages created + deps installed: fx, scene (three 0.186.1 dev / >=0.159 peer), react,
  elements, tokens.
- Showcase dashboard + playground pages (agent-built, agents then stopped at user request). Verified
  by main thread: typecheck clean, production build OK, Playwright e2e 19/20 → fixed the 1 timeout
  (test budget). Playground initial JS cut 156 KB → 16.5 KB gz by lazy-loading the 3D pattern.
- Bug found in real browser: `createStage` never released WebGL contexts → "Too many active WebGL
  contexts" after 24 mounts. Fixed (`forceContextLoss()` when the stage owns the canvas). Re-verify
  with the mount-cycle script (see below) — post-fix run not yet confirmed.
- Root OSS docs, architecture, reference audit, CI workflow, changesets, package READMEs written.

## RESUME HERE (next steps, in order)
1. DONE: mount-cycle re-run after fix → 0 context warnings (was 1). Still add a regression test.
   context warnings). Add a unit/e2e regression for it.
2. `npx biome check . --write` then fix remaining lint; `pnpm run build`; `pnpm -r typecheck`;
   `pnpm test`; `pnpm validate:skill`; `pnpm check:packages` (publint); showcase e2e.
3. Fix showcase "back to site" links (`./index.html` no longer exists in apps/showcase).
4. Write root README.md.
5. User authorized: create public GitHub repo `snowbros-labs/creative-engineering`, push; then
   `npm publish` all `@snowbros/*` packages (npm logged in as ved-chauhan, owns @snowbros scope).
6. THEN website/ flagship with full effort, using the skill (home-scene.ts + home.css missing).
7. Design-hook findings to fix: dashboard.html — 3× cramped padding + 1× functional text < 11px;
   playground.html — flat type hierarchy (heading/body < 1.25× step).
