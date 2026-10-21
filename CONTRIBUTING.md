# Contributing

Thanks for helping build SNOWBROS Creative Engineering. This repository holds three things that evolve
together:

| Path                          | What                                                                                 | Language        |
| ----------------------------- | ------------------------------------------------------------------------------------ | --------------- |
| `packages/*`                  | `@snowbros/*` libraries (core, motion, fx, scene, react, elements, tokens, adapters) | TypeScript      |
| `skills/snowbros-creative`    | The AI skill (SKILL.md + references + scripts)                                       | Markdown, Node  |
| `website/`                    | Project website                                                                      | TS / HTML / CSS |
| `apps/showcase`, `examples/*` | Playground + dashboard demos, integration examples                                   | TS / HTML / CSS |

## Setup

```bash
corepack enable          # or: npm i -g pnpm@11
pnpm install
pnpm run ci                # lint, build, typecheck, unit tests, skill validation, package checks
pnpm dev                 # showcase (playground + dashboard)
pnpm --filter @snowbros/website dev
```

Requirements: Node ≥ 20.19, pnpm 11. End-to-end tests need Playwright browsers:
`pnpm --filter @snowbros/showcase exec playwright install chromium`.

## Ground rules

1. **Zero runtime dependencies in `core`, `motion`, `fx`.** `scene` peers on `three`; `react` peers on
   `react`. A new dependency needs a written reason in the PR (capability, size, license).
2. **Never import or bundle GSAP, Theatre.js Studio or other non-permissive code.** Interop goes through
   `@snowbros/adapters` with structural types (see `docs/research/TECHNOLOGY_EVALUATION.md`).
3. **Every pattern declares a reduced-motion policy** (`skip` | `fade` | `minimal` | `keep`) and has a
   cleanup path that restores inline styles.
4. **No layout reads per frame.** Measure on resize; compute on scroll.
5. **Tests with every change.** Unit tests live in `packages/<pkg>/test`. Browser-only behaviour gets an
   e2e test in `apps/showcase/e2e` or `website/e2e`.
6. **Keep the skill concise.** `SKILL.md` ≤ 500 lines (the validator enforces it); detail goes into
   `references/`. Code samples in the skill must match real package APIs.
7. **Original work only.** No copied proprietary code, models, artwork or brand assets.

## Pull requests

- Branch from `main`; keep PRs focused.
- Run `pnpm run ci` locally and paste the summary into the PR.
- Add a changeset for any change to a published package: `pnpm changeset`.
- UI changes: attach screenshots at 390 px and 1440 px and describe reduced-motion behaviour.

## Commit style

Prefixes help the changelog: `feat(motion): …`, `fix(scene): …`, `docs(skill): …`.

## Licensing of contributions

Unless you state otherwise, any contribution you intentionally submit is dual-licensed under
**MIT OR Apache-2.0**, without additional terms or conditions.
