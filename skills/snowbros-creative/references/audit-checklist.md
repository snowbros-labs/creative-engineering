# Audit checklist (Audit mode)

Score each area 0–4. **0** broken/absent · **1** major issues · **2** works with notable gaps ·
**3** good, minor issues · **4** exemplary. Every score below 4 needs at least one finding with
location, evidence, impact, fix, effort (S/M/L). Start with the scripts:
`detect-stack.mjs` and `audit-motion.mjs --json`.

| #   | Area                              | 4 looks like                                                                                             |
| --- | --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | **Direction & identity**          | one clear idea; consistent type/color/spacing system; no anti-slop patterns (design-direction.md)        |
| 2   | **Information architecture**      | objects/verbs clear; nav ≤ 7 top items; URLs encode state; primary action obvious per view               |
| 3   | **Visual hierarchy & typography** | ≤ 2 families; consistent scale; measure 60–75ch; tabular numbers in data                                 |
| 4   | **Layout & responsiveness**       | real grid; works 320 → 1920 px; no horizontal overflow; touch targets ≥ 44 px                            |
| 5   | **Motion quality**                | every motion has a cause; functional vs expressive applied; durations within token ranges; interruptible |
| 6   | **Reduced motion**                | system preference honored everywhere; policy per pattern; optional in-product toggle                     |
| 7   | **Accessibility**                 | axe 0 serious/critical; keyboard complete; visible focus; landmarks; contrast passes                     |
| 8   | **States & feedback**             | empty/loading/error/success designed; feedback < 100 ms; errors actionable                               |
| 9   | **Performance**                   | CWV good (measured); no long tasks from motion; lazy heavy modules; assets optimized                     |
| 10  | **Reliability & lifecycle**       | no duplicate effects after navigation; cleanup verified; resize/orientation safe; no console errors      |
| 11  | **Implementation quality**        | project conventions followed; one animation engine; tokens used; no dead code                            |
| 12  | **Dependency & license hygiene**  | no unjustified deps; licenses compatible; no copied assets                                               |

**Total /48.** Ship gate suggestion: no area below 2, accessibility and reduced motion ≥ 3.

## Report format

```
Score: 34/48   Gate: FAIL (Accessibility 2)
Top fixes (impact ÷ effort):
1. [A11y] Focus ring removed globally — src/styles/base.css:12 — outline:none without :focus-visible — keyboard users lose position — add :focus-visible ring — S
2. …
Evidence: commands run, viewports, browsers, tools and versions.
Not checked: …
```
