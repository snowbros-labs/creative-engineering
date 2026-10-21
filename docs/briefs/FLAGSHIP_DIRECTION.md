# Flagship direction — "Lattice: one crystal, one clock"

Skill phases 1–3 deliverables for `website/` (brief: [FLAGSHIP_WEBSITE.md](FLAGSHIP_WEBSITE.md)).

## Recon

```
Platform: web-vanilla (Vite 8 MPA, TS)   Styling: plain CSS + @snowbros/tokens custom properties
Motion: @snowbros/motion + fx (workspace sources)   3D: three 0.186 via @snowbros/scene (lazy)
Package manager: pnpm workspace   Tests: Playwright + axe   Reduced motion: shell toggle + media query
State before: copy + markup existed; home.css and the 3D module were never written → page unstyled.
```

## Direction

- **Job:** convince designers and developers that the toolkit produces award-level work, then get
  them installing it. Audience: front-end engineers, design engineers, studio leads.
- **One idea:** the site is an instrument built around a single procedural **snow crystal** — a
  six-fold lattice whose six arms are the six dimensions of the system (Skill, Motion, Interaction,
  Space, Effects, Interface). It is drawn like an engineering drawing in space: ink hairlines on
  warm paper, orange nodes, never a glossy blob. One scroll clock grows it, turns it, and labels it
  until the hero headline has become a technical diagram of the toolkit.
- **System:** paper `#f3f2ee` / ink `#0b0c0e` / signal `#ff4f1f` (CTAs, live state, active arm only);
  Instrument Serif display at extreme scale, Inter Tight text, JetBrains Mono for measurements and
  labels; 12-column grid; hairline rules, registration marks, rulers and coordinate readouts as the
  graphic language; static paper grain. Dark ink bands only where the content is spatial (3D lab).
- **Signature moment:** the pinned _Instrument_ sequence (hero → six dimensions → diagram).
  Everything after it is quieter: labs are working benches, not spectacles.
- **Not doing:** gradients, glass cards, glowing orbs, cursor trails, sound, loaders, scroll hijack,
  identical feature-card grids, always-on render loops.

## Plan (patterns → technology → reduced-motion policy)

| Pattern                   | Tech                                                            | Reduced motion                                          |
| ------------------------- | --------------------------------------------------------------- | ------------------------------------------------------- |
| Lattice geometry (shared) | pure TS generator → SVG and three.js                            | —                                                       |
| Hero lattice + diagram    | `@snowbros/scene` stage, demand rendering, custom growth shader | static SVG, fully grown                                 |
| Instrument pin (desktop)  | `pin` + `scrub` + `segment` on one signal                       | no pin: hero, then six stacked chapters with SVG glyphs |
| Headline reveal           | `revealText` (lines, mask)                                      | fade                                                    |
| Pointer tilt of lattice   | `pointerParallax`                                               | off                                                     |
| Motion lab                | `splitText`, `timeline`, `stagger`, `cubicBezier`, `springEase` | plays instantly (shows end state)                       |
| Interaction lab           | `magnetic`, `tilt`, `spotlight`, `createSpringValue`            | springs settle instantly                                |
| Space lab                 | `withFallback`, `createStage`, `createOrbitInertia`, particles  | SVG fallback                                            |
| Interface lab             | `flip`, keyboard-first chart, validated form                    | instant                                                 |
| Effects lab               | `imageReveal`, `scramble`, `drawPath`, `flowField`, `marquee`   | final states                                            |
| System map                | SVG dependency graph, hover/focus highlights                    | instant                                                 |

Budgets: initial JS (no three) ≤ 40 KB gz; three + scene loaded lazily after first paint; no
continuous rAF when idle; every effect registered on a scope and disposed on HMR.
