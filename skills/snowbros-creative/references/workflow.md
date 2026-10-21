# Workflow — phase checklists and deliverables

Every phase ends with a written deliverable (even if it is three lines). Skipping a phase is allowed
only when its deliverable is obvious; say so.

## 1. Recon

Goal: know the terrain before proposing anything.
- [ ] Run `node scripts/detect-stack.mjs <dir> --pretty`. Read `platform`, `frameworks`, `animation`, `graphics`, `uiKits`, `designTokens`, `recommendations`.
- [ ] Open the entry points: root layout/app shell, global CSS, token/theme files, the component kit folder.
- [ ] Find existing motion: `grep -rn "transition\|@keyframes\|animate\|gsap\|motion" src` (scope to source).
- [ ] Find existing reduced-motion handling: `grep -rn "prefers-reduced-motion\|useReducedMotion" src`.
- [ ] Run the app (dev and, if cheap, production build). Screenshot at 1440px and 390px. Note real issues.
- [ ] Run `node scripts/audit-motion.mjs <dir>` for a baseline.
- [ ] Note constraints: SSR, routing model, CSP, browser support targets, performance budgets, brand guidelines, deadlines.

**Deliverable — Stack profile:**
```
Platform: react-next (Next 15 App Router, RSC)   Styling: Tailwind + CSS vars tokens
Motion: motion@12 for components; no scroll lib   3D: none   UI kit: Radix via shadcn
Tests: vitest, playwright   Reduced motion: handled in 2/14 animated components
Constraints: SSR content must render without JS; LCP < 2.5s target; brand fonts self-hosted
```

## 2. Direction

Goal: one clear idea, appropriate to the audience and the product job.
- [ ] State the job: _inform, convert, onboard, operate, explore, delight_. Products usually _operate_.
- [ ] State the audience and context of use (frequency! daily tools get less motion).
- [ ] Choose a direction from [design-direction.md](design-direction.md) or define one; in Concept mode produce three genuinely different ones.
- [ ] Define the system: type scale (2 families max), spacing scale, color roles, radius, elevation, motion tokens (functional/expressive).
- [ ] Name the one signature moment (if any). Everything else is quieter.

**Deliverable:** direction name, 3-sentence rationale, system summary, signature moment, what is explicitly _not_ done.

## 3. Plan

- [ ] List patterns (from `patterns/`) with: target elements, trigger, technology, reduced-motion policy, cleanup owner.
- [ ] Choose technology per pattern using the hierarchy: _*CSS → WAAPI/View Transitions → existing project library → @snowbros/* → new dependency_* (last needs justification + license check).
- [ ] Budgets: JS added (gzipped), images/models weight, target frame time (16.7 ms at 60 Hz), LCP/CLS targets.
- [ ] Files to touch; files _not_ to touch (business logic, data fetching, auth).
- [ ] Verification plan: which commands, which viewports, which interactions to record.
- [ ] Ask the user before adding dependencies, changing the design system, or restructuring routes.

## 4. Build

- [ ] Work in the project's conventions: file layout, naming, component patterns, styling method, lint rules.
- [ ] Tokens first (CSS variables or theme), then primitives, then compositions.
- [ ] Render final-state markup server-side/initially; enhance on the client. Hide-then-reveal only after JS confirms it will run (e.g. add `.js-motion` class on `<html>` in an inline script, scope initial hidden states to it).
- [ ] One scope (cleanup container) per component/effect; dispose on unmount and route change.
- [ ] Commit-sized steps; keep the app runnable after each.

### Refactor rules (existing UI)

- Preserve behavior, routes, data flow, public component APIs and test IDs.
- Change visuals through tokens and primitives before touching many call sites.
- No framework or kit swaps. If one is truly needed, stop and propose it with evidence.
- Keep diffs reviewable: one concern per change set.

## 5. Verify

Run, then report actual output.
- [ ] `build` (production), `typecheck`, `lint`, unit tests.
- [ ] `node scripts/audit-motion.mjs <dir>` — compare to baseline; no new errors.
- [ ] Browser (Playwright or manual): 1440×900 and 390×844; scroll down _and back up_; navigate away and back (no duplicated effects); resize; keyboard-only pass (Tab order, visible focus, Escape closes); `prefers-reduced-motion: reduce` emulation; zoom 200%.
- [ ] Accessibility: axe (zero serious/critical), headings/landmarks, contrast ≥ 4.5:1 body text.
- [ ] Performance: Performance panel trace during the heaviest interaction — no long tasks > 50 ms caused by motion, no forced reflow in scroll handlers; GPU memory stable after route changes for 3D.
- Recipes: [testing.md](testing.md), [performance.md](performance.md).

## 6. Deliver

Use the report template in SKILL.md. Include: what was verified and how, what was not, screenshots or
recordings if produced, and real follow-ups. Never write "fully tested", "60 FPS everywhere" or
"accessible" without the evidence.
