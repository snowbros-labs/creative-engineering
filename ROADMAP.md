# Roadmap

Direction, not promises. Items move when evidence (user reports, measurements) says they should.

## 0.1 — Foundation (current)

- [x] `core`, `motion`, `fx`, `scene`, `react`, `elements`, `tokens`, `adapters`
- [x] Skill: workflow, modes, pattern catalogue, platform profiles, `detect-stack`, `audit-motion`
- [x] Playground, SaaS dashboard demo, project website
- [ ] First npm publish of `@snowbros/*` and public GitHub release

## 0.2 — Depth

- Vitest browser mode (Playwright provider) for layout-dependent tests (scroll, split lines, FLIP).
- CSS scroll-driven animation backend for `scrollProgress` where `animation-timeline` is supported,
  with the JS model as fallback.
- `@snowbros/vue` and `@snowbros/svelte` thin adapters (composables / runes) on top of core scopes.
- R3F bindings for `scene` concepts (camera rig, quality governor) without a second render loop.
- Bundle-size budgets enforced with `size-limit` in CI.

## 0.3 — Authoring

- JSON timeline format (author once, play in DOM / three / native) and a minimal visual timeline
  inspector — original code, no GSAP or Theatre Studio inside.
- WebGPU path for `scene` behind `renderer: 'webgpu' | 'webgl' | 'auto'` (separate entry point).
- Skill evals: scripted task suite (marketing upgrade, SaaS refactor, cross-framework port) scored
  against the audit rubric, run in fresh sessions.

## Later

- Native companion guides with runnable samples (Flutter, SwiftUI, Compose).
- Design-token theme generator from a few perceptual inputs (LCH/OKLCH).
- Agent support beyond Claude Code once their skill formats are verified and tested.

## Experimental today

`createQualityGovernor` tuning, `scrollVelocity`-driven effects, `smoothScroll` adapter. APIs may change.
