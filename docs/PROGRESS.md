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

## 2026-10-21 (session 2)

- Lint: 101 errors → 0 errors / 0 warnings. Root-cause fixes: dashboard a11y (native radio
  segmented control, semantic stat list, listbox divs, chart `<title>`, registry `<section>`),
  React test components hoisted, misplaced `biome-ignore` comments moved/removed. Justified
  scoped ignores only for `void` callback-return unions, `!important` in visually-hidden and
  reduced-motion CSS, and the keyboard-focusable code scroll region (WCAG 2.1.1).
  `docs/research/**/*.md` excluded from the Biome formatter (its Markdown table formatter
  oscillates between two outputs on that file — Biome bug).
- Verified: `pnpm build`, typecheck (packages + showcase), 94/94 unit tests, `validate:skill`,
  publint on all 8 packages, showcase e2e 21/21 (incl. new WebGL-context regression: 18 3D
  mount/unmount cycles, no "WebGL context" warnings). Playwright workers capped at 2 —
  headless WebGL is SwiftShader (CPU) and starved under more.
- Deployment layout: flagship `website/` at root, showcase built (relative base) for `/demos/`.
  Dev: showcase serves at :5180/demos/, website dev server (:5173) proxies `/demos`.
  Showcase "Back to site"/brand links → `../`.
- Design-check fixes: dashboard demo tag padding, footer text 10.5px → 12px, stale "84 tests" stat → 94.
- detect-stack pnpm-workspace bug confirmed fixed (walks up; reports pnpm + workspaceRoot).
- Root README written. Flagship brief saved: `docs/briefs/FLAGSHIP_WEBSITE.md`.

- Pushed: GitHub repo `snowbros-labs/creative-engineering` created (public) and `main` pushed;
  remote head verified with `git ls-remote` after each push.
- npm publish attempted: blocked by npm 2FA (`ERR_PNPM_OTP_NON_INTERACTIVE`). All 8 names were
  verified free (E404) and `npm whoami` = ved-chauhan. Needs the owner's OTP (see RESUME HERE).

## 2026-10-21 (session 2) — flagship website

- Direction + plan: `docs/briefs/FLAGSHIP_DIRECTION.md` ("Lattice: one crystal, one clock").
  Reference study (live, verified vs inferred): `docs/research/notes-flagship-references.md`
  (note: scoutmotor.com is a domain-for-sale page; scoutmotors.com was studied instead).
- Built `website/`: procedural lattice (shared geometry → WebGL growth/focus/strum shaders, SVG
  fallback), pinned Instrument sequence (hero → six chapters → labelled diagram), strum + tap to
  pluck, kinetic two-voice manifesto, Labs A–F (motion timeline bench, interaction primitives,
  on-demand 3D stage with remount, interface lab with FLIP/keyboard chart/install composer,
  procedural effects, playground deep links), system map (real dependency closure), adoption
  journey, editorial menu (circular reveal, lattice glyph answers hover), floating segmented nav,
  warm palette + paper grain, cursor labels, haptics with opt-out on touch devices.
- Toolkit additions found necessary by the flagship (with unit tests): `@snowbros/core`
  `haptic()`/`hapticPatterns`/`setHapticsEnabled`/`canVibrate`; `@snowbros/fx` `pressable()` and
  `proximity()`. Bug found + fixed: proximity rects went stale after font swap.
- API ergonomics finding (not changed): `flowField` `speed` is px/s and `density` per px²; the old
  site passed 0.5/0.6 and rendered nothing visible. Worth clearer docs or validation.
- Verified: lint clean, packages build, typecheck, 102 unit tests, website e2e (composed build:
  pin, WebGL upgrade, reduced motion flow, 390 px no overflow, axe serious/critical = 0, labs,
  18× Space-lab remount without WebGL context warnings, links incl. /demos/).

## RESUME HERE (next steps, in order)

1. npm publish (owner must supply OTP):
   `pnpm -r --filter "./packages/**" publish --access public --no-git-checks --otp=<code>`.
   Afterwards verify with `npm view @snowbros/<pkg> version`, then update README "not on npm yet",
   the dashboard registry copy, and the playground claim "runs on the published packages".
2. Deploy the composed site (`pnpm --filter @snowbros/website run build:site` → `website/dist`)
   to a host (GitHub Pages workflow not yet written).
3. Remaining audit items: playground type-hierarchy review; showcase stat numbers are hard-coded;
   flowField option docs.
