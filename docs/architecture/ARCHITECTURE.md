# Architecture

SNOWBROS Creative Engineering has two halves that ship from one repository:
- **The skill** (`skills/snowbros-creative`) — instructions + scripts that make an AI agent work like a
  creative director, principal engineer and release engineer. It decides _what_ to build and _with
  which tools_, preferring whatever the target project already uses.
- **The toolkit** (`packages/*`) — the instruments the skill reaches for when a web project has no
  better-suited engine. Each package is independently adoptable.

```
                         ┌──────────────────────────────┐
                         │  skills/snowbros-creative    │  SKILL.md · references/ · scripts/
                         │  (recon → direction → plan → │  detect-stack.mjs · audit-motion.mjs
                         │   build → verify → deliver)  │
                         └──────────────┬───────────────┘
                                        │ chooses (only if the project lacks an equivalent)
     ┌──────────────────────────────────┼──────────────────────────────────────────┐
     │                                  ▼                                          │
     │  @snowbros/tokens      @snowbros/core  ◄── zero deps: ticker · ease · spring │
     │  (DTCG → CSS/TS)            ▲   ▲   ▲      scope · signal · env · media      │
     │                             │   │   │                                        │
     │          @snowbros/motion ──┘   │   └── @snowbros/scene  (peer: three)       │
     │          timeline · scroll ·    │       stage · rig · governor · fallback    │
     │          pin · split · flip     │                                            │
     │                 ▲               │                                            │
     │          @snowbros/fx ──────────┘       @snowbros/adapters                   │
     │          pointer · reveal · canvas      Lenis / GSAP / Motion via structural │
     │                 ▲                        types (never imported)              │
     │     ┌───────────┴───────────┐                                                │
     │  @snowbros/react     @snowbros/elements                                      │
     │  hooks + components  light-DOM custom elements (Vue, Svelte, Astro, HTML)    │
     └──────────────────────────────────────────────────────────────────────────────┘
```

## Core concepts

### One clock

`core/ticker` is the only `requestAnimationFrame` loop. Callbacks run in priority bands —
`input (-100)` → `update (0)` → `render (100)` — so scroll is read before animations advance and
WebGL renders last, all from the same frame time. The loop sleeps when nothing is subscribed and when the
tab is hidden. `useExternalClock()` lets Lenis or GSAP drive it, keeping one loop when those exist.

### The interaction contract

`core/contract.ts` names the shared vocabulary: `ProgressSource` (0..1 producers: scroll, time, drag,
data), `Seekable` (anything renderable at a progress), `Playable`, `TimingOptions`, `ExpressionOptions`,
`ReducedMotionPolicy` and `PatternHandle` (idempotent `dispose`). Renderers implement it natively — a
DOM timeline, a Three.js camera rig, an SVG path and a GSAP timeline (via `fromGsap`) are all
`Seekable`, so `scrub(seekable, progressSource)` composes any of them with any progress producer.

### Lifecycle scopes

`createScope()` collects everything an effect creates (listeners via `AbortSignal`, observers,
timelines, GPU resources, child scopes) and disposes it in reverse order, once, isolating failures.
Late registrations after disposal are disposed immediately (a model that finishes loading after unmount
does not leak). Framework adapters map scopes onto their lifecycles: `useSnowbros` (React effects,
StrictMode-safe), `connectedCallback`/`disconnectedCallback` (custom elements).

### Scroll model

Native scroll, never hijacked. `scrollProgress` measures element offsets (transform-independent
`offsetTop` chain) on creation, window resize, container `ResizeObserver` and font loading; per scroll
event it only marks the container dirty and schedules one `input`-priority flush. `pin` is CSS sticky
(no DOM re-parenting or spacers) using `svh` units. Composition happens on **one** progress: a pinned
section exposes `pin.progress`, and several timelines, a camera rig and DOM writes subscribe to it,
splitting it with `segment(progress, start, end)` — no competing scroll controllers.

### Motion engine

`motion/timeline` is a seekable, time- or progress-driven engine for DOM elements and plain objects.
Transform components (`x`, `y`, `scale`, `rotate`…) are cached per element and composed in a fixed
order, so independent tweens can own different components. Values interpolate numerically across units,
colors and complex strings (`clip-path`, `filter`). Seeking renders children in start order going
forward and reverse order going backward, so overlapping tweens on one property resolve correctly in
both directions. Simple product transitions should prefer CSS or WAAPI (`flip`, `viewTransition` use
WAAPI and the View Transitions API).

### Reduced motion

`motionPreference` merges the OS setting with an optional in-app override (`setMotionPreference`).
Every pattern declares a policy (`skip`, `fade`, `minimal`, `keep`). `createMediaContext` accepts
`reduced-motion` / `full-motion` keywords next to media queries, so a pinned scroll scene can be swapped
for a stacked layout — and back — when the preference changes at runtime.

### 3D

`scene/createStage` owns renderer, scene and camera; renders from the shared ticker at `render`
priority; caps DPR by device tier; caps fps on the low tier; pauses offscreen and in hidden tabs;
recovers from context loss; and frees every tracked geometry, material and texture on dispose.
`withFallback` makes 3D a progressive enhancement: capability/tier/reduced-motion decision, lazy start
near the viewport, automatic fallback when rendering throws.

## Package boundaries

| Package  | Depends on       | Peers                              | Side effects                                   |
| -------- | ---------------- | ---------------------------------- | ---------------------------------------------- |
| core     | —                | —                                  | none (env reads `matchMedia` lazily at import) |
| motion   | core             | —                                  | none                                           |
| fx       | core, motion     | —                                  | none                                           |
| scene    | core             | three ≥ 0.159                      | none                                           |
| react    | core, motion, fx | react ≥ 18.2                       | none                                           |
| elements | core, motion, fx | —                                  | `./define` entry registers elements            |
| tokens   | —                | —                                  | CSS file                                       |
| adapters | core             | lenis, gsap, motion (all optional) | none                                           |

All packages are ESM-only, `sideEffects: false` (except noted), built with `tsc` (TypeScript 7) to
`dist/` with declarations and source maps. Tests run against sources via Vitest aliases.

## Skill architecture

- `SKILL.md` stays short (operating loop, modes, hard rules, script usage, reference index).
- `references/` hold detail loaded on demand: workflow, modes, design direction, motion system,
  pattern families, platform profiles (web, React/Next, Vue/Nuxt, Svelte, Web Components, three/R3F,
  Flutter, SwiftUI, Compose, desktop, backend-driven UI), accessibility, performance, testing, audit.
- `scripts/` are zero-dependency, read-only Node scripts: `detect-stack.mjs` (stack profile +
  recommendations) and `audit-motion.mjs` (static motion/a11y/perf smell scan).
- `tools/validate-skill.mjs` validates frontmatter, size and links in CI.

## Repository layout

```
packages/        @snowbros/* libraries
skills/          the AI skill
website/         project website (built with the skill + toolkit)
apps/showcase/   playground + SaaS dashboard demos (e2e-tested)
examples/        integration examples for other frameworks
docs/            research, architecture, progress log
tools/           repository tooling (skill validator, tests)
```
