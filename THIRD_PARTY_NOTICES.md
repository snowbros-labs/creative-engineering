# Third-party notices

SNOWBROS Creative Engineering source code is original and dual-licensed MIT OR Apache-2.0.
No third-party source code is vendored into the published packages.

## Runtime peer dependencies (installed by you, not bundled)

| Package | License | Used by |
|---|---|---|
| three | MIT | `@snowbros/scene` (peer), website, showcase |
| react / react-dom | MIT | `@snowbros/react` (peer) |
| lenis | MIT | optional, via `@snowbros/adapters` |
| motion | MIT | optional, via `@snowbros/adapters` |
| gsap | GSAP Standard "no charge" license, not OSI-approved — https://gsap.com/standard-license | optional, via `@snowbros/adapters` structural types only; never imported or bundled |

`@snowbros/scene` dynamically imports loaders from `three/examples/jsm` (MIT, part of three) only when
the matching option is used.

## Development-only tools

TypeScript (Apache-2.0), Vite (MIT), Vitest (MIT), happy-dom (MIT), Playwright (Apache-2.0),
@axe-core/playwright (MPL-2.0, devDependency only), Biome (MIT OR Apache-2.0), publint (MIT),
@testing-library/react (MIT).

## Fonts used by the website and showcase

Instrument Serif, Inter Tight and JetBrains Mono — SIL Open Font License 1.1, loaded from Google Fonts.
They are not redistributed in this repository.

## Assets

All visuals in the website and showcase (flow fields, particles, crystal geometry, SVG illustrations)
are generated in code in this repository. No third-party images, models or HDR files are included.

## Research references

`docs/research/` documents observations of public websites (e.g. cvnt.in, landonorris.com). Only short
identifying strings are quoted; no proprietary code or assets were copied.
