# SNOWBROS Creative Engineering

An AI skill plus a modular TypeScript toolkit for motion, scroll choreography, interactive 3D and
premium product interfaces. The skill is the judgement — when to be cinematic, when to be quiet,
which tool fits the project already in front of it. The packages are the hands — small,
dependency-free libraries with correct cleanup, reduced-motion behaviour and performance budgets
built in.

> **Status: 0.1 — pre-release.** The packages are not on npm yet. Everything below works from a
> clone of this repository today; npm install commands will work once 0.1.0 is published (tracked
> in [`docs/PROGRESS.md`](docs/PROGRESS.md)).

## What's inside

| Path                                                   | What it is                                                                                                |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| [`skills/snowbros-creative`](skills/snowbros-creative) | The AI skill (`SKILL.md`, on-demand references, zero-dependency `detect-stack` / `audit-motion` scripts)  |
| [`packages/core`](packages/core)                       | Shared frame ticker, easing, springs, lifecycle scopes, signals, capability + motion-preference detection |
| [`packages/motion`](packages/motion)                   | Tweens, timelines, scroll progress, scrub, sticky pins, accessible split text, FLIP, view transitions     |
| [`packages/fx`](packages/fx)                           | Magnetic/tilt pointer effects, cursors, image reveals, scramble, SVG path drawing, marquees, flow fields  |
| [`packages/scene`](packages/scene)                     | Three.js stages with full GPU cleanup, camera rigs, procedural materials, adaptive quality, fallbacks     |
| [`packages/react`](packages/react)                     | React hooks/components with StrictMode-safe cleanup                                                       |
| [`packages/elements`](packages/elements)               | Web Components for plain HTML, Vue, Svelte, Astro and server-rendered stacks                              |
| [`packages/adapters`](packages/adapters)               | Interop with Lenis, GSAP and Motion — shares one frame loop, never bundles them                           |
| [`packages/tokens`](packages/tokens)                   | Motion, type, spacing and colour tokens (W3C DTCG) as CSS custom properties and TypeScript                |
| [`apps/showcase`](apps/showcase)                       | Working demos: a SaaS control-room dashboard and a live pattern playground                                |
| [`website`](website)                                   | The flagship site (in progress), built with the skill and toolkit                                         |

Design principles: one shared clock instead of many rAF loops; native scroll stays native (no
scroll hijacking); every effect registers its teardown in a scope; reduced motion is a designed
alternative, not a switch-off; three.js is an optional peer, never bundled. See
[`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md).

## Use the skill

The skill works with Claude Code today (other agents that read `SKILL.md` folders are untested).

```bash
git clone https://github.com/snowbros-labs/creative-engineering.git
cp -r creative-engineering/skills/snowbros-creative ~/.claude/skills/        # all projects
# or, per project:
mkdir -p .claude/skills && cp -r creative-engineering/skills/snowbros-creative .claude/skills/
```

Start a new session and ask for design or motion work, or invoke `/snowbros-creative`. The skill
first inspects the project (`scripts/detect-stack.mjs`: framework, package manager, existing
animation/3D libraries, styling), picks a mode (subtle product UI → cinematic storytelling), then
builds with what the project already uses before reaching for new dependencies. Details:
[`skills/README.md`](skills/README.md).

```bash
node ~/.claude/skills/snowbros-creative/scripts/detect-stack.mjs . --pretty
node ~/.claude/skills/snowbros-creative/scripts/audit-motion.mjs .
```

## Use the packages

Once published:

```bash
npm install @snowbros/core @snowbros/motion          # add fx / scene / react / elements as needed
npm install three                                     # only if you use @snowbros/scene
```

```ts
import { pin, revealText, scrollProgress, timeline, scrub } from '@snowbros/motion';

revealText(document.querySelector('h1')!, { by: 'words' });

const section = document.querySelector<HTMLElement>('#story')!;
const p = pin(section, { distance: '200vh' });
const tl = timeline()
  .to('.panel-a', { opacity: [1, 0], y: [0, -40] })
  .to('.panel-b', { opacity: [0, 1], y: [40, 0] }, '<0.2');
scrub(tl, p.progress, { smooth: 10 });
```

React:

```tsx
import { useSnowbros } from '@snowbros/react';
import { revealText } from '@snowbros/motion';

function Title() {
  const ref = useRef<HTMLHeadingElement>(null);
  useSnowbros((scope) => {
    scope.add(revealText(ref.current!));
  }, []);
  return <h1 ref={ref}>Motion with intent</h1>;
}
```

Each package README documents its full API.

## Develop

Requirements: Node ≥ 20.19, pnpm 11.

```bash
pnpm install
pnpm build              # build all packages (tsc → ESM + .d.ts)
pnpm dev                # showcase demos at http://localhost:5180/demos/
pnpm --filter @snowbros/website dev   # flagship site at http://localhost:5173 (proxies /demos)

pnpm lint               # Biome
pnpm typecheck
pnpm test               # Vitest unit tests (happy-dom)
pnpm test:e2e           # Playwright: axe, keyboard, reduced motion, WebGL context lifecycle
pnpm validate:skill     # skill frontmatter, size, links, script syntax
pnpm check:packages     # publint on every package
pnpm ci                 # everything above except e2e
```

## Contributing

Issues and pull requests are welcome — read [`CONTRIBUTING.md`](CONTRIBUTING.md) first. Versioning
follows [`VERSIONING.md`](VERSIONING.md) with Changesets (`pnpm changeset`). Security reports:
[`SECURITY.md`](SECURITY.md). Community expectations: [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).
Plans: [`ROADMAP.md`](ROADMAP.md).

## License

Dual-licensed under [MIT](LICENSE-MIT) or [Apache-2.0](LICENSE-APACHE), at your option.
Third-party notices: [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
