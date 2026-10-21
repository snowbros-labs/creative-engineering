# Technology Evaluation: `@snowbros/*` creative-engineering toolkit

- **Date:** 2026-10-21
- **Project license target:** MIT OR Apache-2.0
- **Method:** Package metadata comes from running `npm view <pkg> version license dist.unpackedSize time.modified peerDependencies repository.url --json` (and `dist-tags` / `time`) against the public npm registry on 2026-10-21. Browser support comes from caniuse.com and MDN pages fetched on the same day. Licenses and capabilities come from official docs and repos, which are cited inline.

## Conventions

- **[npm]** = output of `npm view` against https://registry.npmjs.org on 2026-10-21, for the package named in that row. Every version, license string, unpacked size and modified date in the tables carries this label unless a row says otherwise.
- **`unpackedSize` is not bundle size.** It is the unpacked tarball, which includes UMD/CJS/ESM copies, maps, types and plugins. GSAP's 6.26 MB, for example, includes every bonus plugin. Use size-limit or bundlejs for real min+gz costs. **No min+gz numbers were measured for this document.**
- **"Last modified"** is the registry `time.modified` field. It can change without a release (for example, a dist-tag edit). Where it matters, the actual release date of `latest` from `npm view <pkg> time` is given.
- Claims labeled **(secondary source)** come from news coverage, not from the vendor's own page. Claims labeled **(not fetched)** are doc URLs supplied as references whose content was not re-fetched in this session.
- None of this is legal advice. The license analysis is an engineering risk assessment.

---

## 1. Animation

### 1.1 JS animation libraries

| Package | Latest | License | Unpacked | Last modified | Peer deps | Capability | Maturity / interop / perf notes | Best fit |
|---|---|---|---|---|---|---|---|---|
| `gsap` | 3.15.0 (released 2026-04-13) | **"Standard 'no charge' license: https://gsap.com/standard-license."** Not an OSI license. | 6,258,071 B | 2026-04-13 | none | Tweens, timelines, ScrollTrigger, SplitText, MorphSVG and other plugins, all free since 3.13 ([gsap.com/blog/3-13](https://gsap.com/blog/3-13/)) | Very mature. Framework-agnostic ([npm] description). Owned by Webflow since 2024-10-15 ([webflow.com/blog/webflow-acquires-gsap](https://webflow.com/blog/webflow-acquires-gsap)). The license contains a field-of-use restriction (see section 6, item 5). | Bespoke marketing and scroll storytelling in end-user apps. Not a hard dependency of an OSS library. |
| `motion` | 14.5.0 | MIT | 890,190 B | 2026-10-21 | optional `react`/`react-dom` `^18` or `^19` | Vanilla `animate()`/`scroll()` plus React. Described as a "hybrid engine" that combines browser performance with a JS engine. The mini `animate()` is "just 3.2kb" ([motion.dev/docs/quick-start](https://motion.dev/docs/quick-start)). | Very active: release on 2026-10-21 [npm]. `framer-motion` is the same repo at the same version (14.5.0) [npm]. | Default optional adapter for React and vanilla, and spring/gesture/layout animation. |
| `lenis` | 1.3.27 | MIT | 458,320 B | 2026-10-15 | optional `react >=17`, `vue >=3`, `@nuxt/kit >=3` | Smooth scroll that wraps native scroll. Ships `lenis/react`, `lenis/vue`, `lenis/framer` and `lenis/snap`. Documents a GSAP ScrollTrigger recipe. "A few KB with zero runtime dependencies." ([github.com/darkroomengineering/lenis](https://github.com/darkroomengineering/lenis)) | Caveats from the README: no CSS scroll-snap (use `lenis/snap`); nested scroll needs configuration; no wheel events over iframes; "capped to 60fps on Safari and 30fps in low power mode." | Optional smooth-scroll adapter only. Never the default, because of accessibility and native-feel concerns. |
| `animejs` | 4.5.0 | MIT | 2,126,307 B | 2026-08-17 | optional `three >=0.150.0` | v4 modules: Animation, Timer, Timeline, Animatable, Draggable, Layout, Scope, onScroll/ScrollObserver, SVG (morphTo, createDrawable, createMotionPath), Text (splitText, scrambleText), a WAAPI wrapper, springs, and a Three.js adapter ([animejs.com/documentation](https://animejs.com/documentation/)) | Actively maintained. It is the main MIT alternative to GSAP's feature set. | MIT-clean GSAP alternative. Worth a reference adapter. |
| `popmotion` | 11.0.5 | MIT | 304,115 B | **2022-08-15** | none | Low-level tween/spring/inertia | **Stale:** no publish in more than 3 years [npm]. Its ideas live on in Motion. | Do not adopt. |
| `@theatre/core` | 0.7.2 (released 2024-05-19) | Apache-2.0 | 903,189 B | 2024-05-19 | none | Keyframe-sequence runtime for projects authored in Studio | **No release in about 17 months** [npm `time`]. The npm `repository.url` points to `AriaMinaei/theatre`. | Playback of sequences exported from Theatre only. Treat as frozen. |
| `@theatre/studio` | 0.7.2 | **AGPL-3.0-only** | 22,283,657 B | 2024-05-19 | `@theatre/core: *` | Visual timeline editor that runs in the page | The repo LICENSE applies AGPL v3 to "Files: theatre/studio/..." and Apache-2.0 to the rest ([github.com/theatre-js/theatre/blob/main/LICENSE](https://github.com/theatre-js/theatre/blob/main/LICENSE)). | Dev-time only, never bundled or re-exported (see section 6, item 5). |
| `@rive-app/canvas` | 2.45.0 | MIT | 5,741,367 B | 2026-10-17 | none | WASM runtime for `.riv` state-machine animations. Mostly WASM, which explains the size. | Active. The runtime repo is MIT, "Copyright (c) 2020-2021 Rive" ([github.com/rive-app/rive-wasm/blob/master/LICENSE](https://github.com/rive-app/rive-wasm/blob/master/LICENSE)). Variants `@rive-app/canvas-lite` and `@rive-app/webgl2` are also at 2.45.0 [npm dist-tags]. | Designer-authored interactive vector assets |
| `@rive-app/react-canvas` | 4.37.0 | MIT | 49,260 B | 2026-10-18 | `react ^16.8 to ^19.0` | React binding for the runtime above | Thin wrapper | React Rive embedding |

### 1.2 Platform animation features (Baseline / caniuse)

| Feature | Chrome/Edge | Firefox | Safari (macOS/iOS) | Global | Baseline | Source |
|---|---|---|---|---|---|---|
| Web Animations API (`Element.animate`) | Full from 84 | Full from 75 | Full from 13.1 | 97.2% | Interoperable for years. MDN's API overview page did not show the badge in the fetched content. | [caniuse.com/web-animation](https://caniuse.com/web-animation) |
| `animation-timeline: scroll()` | 115+ | **161 only** (2–160 not supported) | **26.0+** | n/a on that page | MDN: **"Limited availability"** / "not Baseline" | [caniuse.com/mdn-css_properties_animation-timeline_scroll](https://caniuse.com/mdn-css_properties_animation-timeline_scroll), [MDN animation-timeline](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline) |
| `animation-timeline: view()` | 115+ | 161 desktop. **Firefox for Android 158: not supported.** | 26.0+ | 87.84% | Limited availability (MDN, above) | [caniuse.com/mdn-css_properties_animation-timeline_view](https://caniuse.com/mdn-css_properties_animation-timeline_view) |
| View Transitions (same-document) | 111+ | **144+** (143 behind a flag) | 18.0+ | 92.9% | Supported in all three engines | [caniuse.com/view-transitions](https://caniuse.com/view-transitions) |
| View Transitions (cross-document, `@view-transition`) | 126+ | **Partial** in 144–161 (limits not described). Not supported in Samsung Internet. | 18.2+ | 88.81% | Not interoperable yet | [caniuse.com/cross-document-view-transitions](https://caniuse.com/cross-document-view-transitions) |

**What this means:** CSS scroll-driven animations just reached the third engine (Firefox 161), but they are not Baseline and Firefox Android lacks `view()`. Use them as progressive enhancement behind `@supports (animation-timeline: scroll())`, which MDN demonstrates on the page cited above, with a JS (IntersectionObserver/scroll) fallback.

---

## 2. 3D

| Package | Latest | License | Unpacked | Last modified | Peer deps | Capability / status | Notes | Best fit |
|---|---|---|---|---|---|---|---|---|
| `three` | **0.186.1** (0.186.0 released 2026-09-08) | MIT | 20,443,256 B | 2026-09-24 | none | `WebGPURenderer` "tries to use a WebGPU backend if the browser supports WebGPU. If not, `WebGPURenderer` falls backs to a WebGL 2 backend". `forceWebGL: true` forces WebGL 2 ([threejs.org/docs/pages/WebGPURenderer.html](https://threejs.org/docs/pages/WebGPURenderer.html)). TSL is "a Node-based shader abstraction, written in JavaScript" that compiles to WGSL (WebGPU) or GLSL (WebGL2), imported from `three/tsl` and `three/webgpu` ([three.js wiki: TSL](https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language)). | Roughly monthly minor releases: r160 2023-12-22 to r183 2026-02-18, r184 2026-04-16, r185 2026-06-25, r186 2026-09-08 [npm `time`]. No semver: every minor can break. | Primary 3D target |
| `@react-three/fiber` | **9.8.2** | MIT | 2,399,634 B | 2026-10-17 | `react >=19 <19.4`, `react-dom >=19 <19.4`, `three >=0.156`, plus optional Expo/RN | "@react-three/fiber@9 pairs with react@19." "v10 is in alpha" and brings WebGPU support and a new frame-loop scheduler ([r3f.docs.pmnd.rs](https://r3f.docs.pmnd.rs/getting-started/introduction)). dist-tags: `alpha` 10.0.0-alpha.6 [npm]. | The **upper bound `<19.4`** on React is tight. React latest is 19.3.1 [npm]. | React 3D adapter |
| `@react-three/drei` | 10.7.9 | MIT | 1,753,692 B | 2026-09-25 | `react ^19`, `three >=0.159`, `@react-three/fiber ^9` | R3F helper library | Its peer floor is **three ≥0.159** | React 3D helpers (optional) |
| `ogl` | 1.0.11 | **Unlicense** | 423,239 B | **2025-01-27** | none | Minimal WebGL library | Small, but slow-moving (about 21 months since the last publish) [npm] | Lightweight shader and effects packages that don't need three |
| `@gltf-transform/core` / `@gltf-transform/cli` | 4.5.1 / 4.5.1 | MIT | 1,842,648 B / 439,770 B | 2026-09-28 | none | glTF read/write/optimize pipeline (homepage https://gltf-transform.dev/ [npm]) | Active. `repository.url` is absent from npm metadata [npm]. | Asset pipeline CLI and build step |
| `meshoptimizer` | 1.3.0 | MIT | 313,134 B | 2026-09-25 | none | Mesh optimization and `EXT_meshopt_compression` decoder | Active | Default geometry compression |
| `draco3d` | 1.5.9 | Apache-2.0 | 847,126 B | 2026-10-16 | none | Draco geometry codec (Google) | Active | Legacy or compatibility geometry compression |
| `ktx2-encoder` | 0.6.0 | MIT | 3,435,553 B | 2026-07-19 | none | KTX2/Basis encoding in JS/WASM | Third-party (gz65555) [npm] | Optional texture-encoding step |
| `basis_universal` (npm) | 1.16.4-1 | MIT | 4,271,814 B | 2025-08-24 | none | "A package that runs the basis_universal executable" | **Unofficial:** homepage `github.com/erichederstedt/basis_universal`, one individual maintainer [npm]. | Avoid. Use the official Basis/KTX tools or gltf-transform. |

### WebGPU browser support, 2026

| Browser | Status | Source |
|---|---|---|
| Chrome / Edge desktop | 113+ | [caniuse.com/webgpu](https://caniuse.com/webgpu) |
| Chrome Android | Supported (155) | same |
| Safari iOS | 26.0+ | same |
| Safari macOS | **"Partial support" 26.0–27.1** | same |
| Firefox | caniuse: "disabled by default" in all listed versions. **However:** WebGPU shipped on Windows in Firefox 141 (2025-07-22) and on Apple Silicon macOS in Firefox 147 (2026-01-13). Linux was not confirmed. | [caniuse.com/webgpu](https://caniuse.com/webgpu); [simonwillison.net/2025/Jul/16/webgpu-firefox](https://simonwillison.net/2025/Jul/16/webgpu-firefox) (secondary source); [linuxiac.com: WebGPU lands in Firefox 141](https://linuxiac.com/webgpu-lands-in-firefox-141-on-windows-eyes-linux-and-macos-next/) (secondary source); [web.dev/blog/webgpu-supported-major-browsers](https://web.dev/blog/webgpu-supported-major-browsers) |
| Global | about 87.8% including partial | [caniuse.com/webgpu](https://caniuse.com/webgpu) |
| Baseline | MDN: "not Baseline" | [MDN WebGPU_API](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API) |

The caniuse data and the Firefox release-note coverage disagree, which most likely reflects per-OS rollout. Either way, WebGPU is **not universally available**. Feature-detect with `navigator.gpu` and `requestAdapter()` and fall back to WebGL2.

---

## 3. UI architecture

| Package | Latest | License | Unpacked | Last modified | Peer deps | Notes | Best fit |
|---|---|---|---|---|---|---|---|
| `react` | **19.3.1** | MIT | 178,663 B | 2026-10-20 | — | R3F 9 requires React `>=19 <19.4` [npm] | Primary framework adapter |
| `next` | 16.4.2 | MIT | 192,517,704 B | 2026-10-20 | `react ^18.2` or `^19` | App framework, not a library dependency | Docs and demo site |
| `vue` | 3.5.44 | MIT | 2,581,780 B | 2026-10-16 | optional `typescript` | — | Secondary adapter (Lenis ships `lenis/vue`) |
| `svelte` | 5.57.2 | MIT | 2,946,697 B | 2026-10-06 | — | "Runes are symbols that you use in `.svelte` and `.svelte.js` / `.svelte.ts` files to control the Svelte compiler" ([svelte.dev/docs/svelte/what-are-runes](https://svelte.dev/docs/svelte/what-are-runes)) | Secondary adapter: actions/attachments that wrap the vanilla core |
| `lit` | 3.3.3 | **BSD-3-Clause** | 106,390 B | 2026-05-14 | — | Web Components. BSD-3 is permissive and compatible with MIT/Apache. | Framework-neutral `<snow-*>` custom elements |
| `radix-ui` (meta) / `@radix-ui/react-dialog` | 1.8.1 / 1.3.1 | MIT | 105,530 B / 107,250 B | 2026-10-14 | `react ^16.8 to ^19` | Headless accessible primitives | Accessible overlay primitives in React demos and components |
| `react-aria` | 3.53.1 | Apache-2.0 | 15,746,744 B | 2026-10-09 | `react ^16.8 to ^19` | Adobe hooks for accessibility and i18n | Alternative to Radix when interaction semantics matter more |
| `@floating-ui/dom` | 1.8.0 | MIT | 174,208 B | 2026-07-11 | — | Positioning engine, vanilla | Tooltip and popover positioning in vanilla/WC packages |
| `style-dictionary` | 5.7.0 | Apache-2.0 | 4,402,506 B | 2026-10-16 | — | Token build tool | Token pipeline |

**W3C Design Tokens (DTCG) format:** Version **2025.10** is a **"Final Community Group Report"** published **28 October 2025**. Its status section says "This specification is considered stable." It is not a W3C Standard ([designtokens.org/TR/2025.10/format](https://www.designtokens.org/TR/2025.10/format/)). A newer editor's draft (dated 08 September 2026) says not to implement it ([designtokens.org/tr/drafts/format](https://www.designtokens.org/tr/drafts/format/)). **Author tokens against 2025.10.**

---

## 4. Native equivalents (doc references only)

These URLs are official documentation **(not fetched)** in this session. They are included to map web concepts to their native counterparts.

| Web concept | Flutter | SwiftUI | Jetpack Compose |
|---|---|---|---|
| Imperative timeline / controller | `AnimationController`: https://api.flutter.dev/flutter/animation/AnimationController-class.html | `withAnimation`: https://developer.apple.com/documentation/swiftui/withanimation(_:_:) | `Animatable` / `animate*AsState`: https://developer.android.com/develop/ui/compose/animation/value-based |
| Implicit / declarative transitions | Implicit animations: https://docs.flutter.dev/ui/animations/implicit-animations | `.animation(_:value:)` / `withAnimation` (above) | `AnimatedVisibility` / `AnimatedContent`: https://developer.android.com/develop/ui/compose/animation/composables-modifiers |
| Shared element (≈ View Transitions) | Hero: https://docs.flutter.dev/ui/animations/hero-animations | `matchedGeometryEffect`: https://developer.apple.com/documentation/swiftui/view/matchedgeometryeffect(id:in:properties:anchor:issource:) | `SharedTransitionLayout`: https://developer.android.com/develop/ui/compose/animation/shared-elements |
| Multi-step / keyframes | Overview: https://docs.flutter.dev/ui/animations | `PhaseAnimator`: https://developer.apple.com/documentation/swiftui/phaseanimator · `KeyframeAnimator`: https://developer.apple.com/documentation/swiftui/keyframeanimator | Overview: https://developer.android.com/develop/ui/compose/animation/introduction |

---

## 5. Testing and tooling

| Package | Latest | License | Unpacked | Last modified | Key peers | Notes |
|---|---|---|---|---|---|---|
| `vitest` | **5.0.5** | MIT | 2,817,789 B | 2026-10-19 | `vite ^6.4` or `^7` or `^8`; optional `@vitest/browser-playwright 5.0.5`, `happy-dom`, `jsdom` | Browser Mode providers: `playwright` (recommended, "supports parallel execution"), `webdriverio`, and `preview` (local only; CI needs one of the others) ([vitest.dev/guide/browser](https://vitest.dev/guide/browser/)). dist-tags include `V4` 4.1.12 and `V3` 3.2.7 [npm]. |
| `@playwright/test` | **1.64.1** | Apache-2.0 | 28,542 B | 2026-10-21 | — | E2E and visual tests |
| `@axe-core/playwright` | 4.14.0 | **MPL-2.0** | 47,795 B | 2026-10-15 | `playwright-core >=1.0.0` | Accessibility scans. MPL-2.0 is file-level copyleft and fine as a **devDependency**. |
| `happy-dom` | 21.0.4 | MIT | 9,185,190 B | 2026-10-20 | — | Fast DOM emulation. No layout, no rendering, no WAAPI timing fidelity. |
| `jsdom` | 30.1.3 | MIT | 5,540,685 B | 2026-10-15 | optional `canvas ^3.2.3` | More spec-complete emulation, but still has no layout engine |
| `tsup` | 9.0.0 (released 2026-10-14) | MIT | 510,170 B | 2026-10-14 | `typescript >=4.5.0`, optional `@microsoft/api-extractor`, `@swc/core` | The README says **"This project is not actively maintained anymore. Please consider using tsdown instead."** ([github.com/egoist/tsup](https://github.com/egoist/tsup)), even though 9.0.0 was just published [npm]. |
| `tsdown` | **0.23.1** | MIT | 181,924 B | 2026-10-10 | `typescript ^5` or `^6` or `^7`; optional `publint ^0.3.8`, `@arethetypeswrong/core ^0.18.1`, `unplugin-unused` | "The Elegant Library Bundler", powered by Rolldown, with first-class `.d.ts` output and a "Migrate from tsup" guide ([tsdown.dev/guide](https://tsdown.dev/guide/)). Still **0.x** [npm]. It integrates publint and attw as optional peers [npm]. |
| `vite` | **8.3.5** | MIT | 2,383,283 B | 2026-10-21 | `@types/node ^20.19` or `>=22.12`, optional `esbuild ^0.27` or `^0.28` | Library mode is viable, but it does not emit `.d.ts` without a plugin |
| `@changesets/cli` | 3.0.3 | MIT | 88,598 B | 2026-09-14 | — | Monorepo versioning and changelogs |
| `size-limit` | 14.2.0 | MIT | 50,216 B | 2026-10-07 | — | Bundle-budget CI gate |
| `publint` | 0.3.25 | MIT | 117,447 B | 2026-10-01 | — | Lints package.json `exports` |
| `@arethetypeswrong/cli` | 0.18.5 | MIT | 59,387 B | 2026-07-09 | — | Checks type resolution across `node16`, `bundler` and other resolution modes |
| `typescript` | **7.0.2** (released 2026-07-08) | Apache-2.0 | 2,497,498 B | 2026-10-21 | — | dist-tags: `beta` 7.1.0-beta, `next` 7.1.0-dev.20261021.1 [npm]. 6.0.3 was released 2026-04-16 [npm `time`]. **TS 7 is the native Go compiler, "8x to 12x" faster on full builds, and has "no stable programmatic API". Microsoft expects one in 7.1, and `@typescript/typescript6` is offered for side-by-side installs** ([linuxiac.com](https://linuxiac.com/typescript-7-0-rewrites-the-compiler-in-go-for-up-to-12x-faster-builds/), [adtmag.com](https://adtmag.com/articles/2026/07/10/microsoft-bets-typescript-future-on-a-native-compiler.aspx); secondary sources, official GA post not fetched). |
| `@biomejs/biome` | 2.6.2 | MIT OR Apache-2.0 | 915,615 B | 2026-10-21 | — | Formatter plus linter. "568 rules", "~35x" faster than Prettier on its benchmark, "97% compatibility with Prettier" ([biomejs.dev](https://biomejs.dev/)). The fetched page did not claim type-aware linting. |
| `eslint` | 10.13.0 | MIT | 2,950,609 B | 2026-10-16 | optional `jiti` | Its type-aware rules depend on typescript-eslint, which relies on the TS programmatic API (see the TS 7 caveat above). |

---

## 6. RECOMMENDATIONS

**(1) Make the core motion engine dependency-free and add optional adapters for GSAP, Motion and Lenis: yes.**

- `@snowbros/motion-core` should have **zero runtime dependencies**. Build it on the Web Animations API, which has 97.2% global support with full support from Chrome 84, Firefox 75 and Safari 13.1 ([caniuse.com/web-animation](https://caniuse.com/web-animation)), plus a small rAF scheduler for values WAAPI can't drive (canvas, WebGL uniforms, three.js objects).
- Use CSS scroll-driven animations only as progressive enhancement. `scroll()` and `view()` are not Baseline ("Limited availability", [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline)). Firefox supports them only from 161 and Firefox Android lacks `view()` ([caniuse view()](https://caniuse.com/mdn-css_properties_animation-timeline_view)). Ship an IntersectionObserver/scroll-event fallback.
- Use View Transitions (same-document) with feature detection. It is supported in Chrome 111+, Safari 18+ and Firefox 144+ ([caniuse](https://caniuse.com/view-transitions)). Treat cross-document transitions as enhancement only, because Firefox support is partial ([caniuse](https://caniuse.com/cross-document-view-transitions)).
- Ship adapters as **separate packages** with **optional peer dependencies** (`peerDependenciesMeta: { optional: true }`):
  - `@snowbros/adapter-motion` → `motion@^14` (MIT, [npm]; active, released 2026-10-21)
  - `@snowbros/adapter-lenis` → `lenis@^1.3` (MIT, [npm])
  - `@snowbros/adapter-gsap` → `gsap@^3.13` (proprietary no-charge license, [npm] / [gsap.com/standard-license](https://gsap.com/standard-license))
  - Optionally `@snowbros/adapter-anime` → `animejs@^4` (MIT, [npm])
- The core must never import an adapter. That keeps the default install 100% MIT/Apache and keeps the GSAP license out of the dependency graph for users who don't opt in.
- Don't adopt `popmotion`: no publish since 2022-08-15 [npm].

**(2) Build tool for TypeScript libraries (ESM + `.d.ts`): tsdown, with publint and attw in CI.**

- Use **`tsdown@0.23.x`**: Rolldown-based, first-class `.d.ts` output, and optional peer integration with `publint` and `@arethetypeswrong/core` ([tsdown.dev/guide](https://tsdown.dev/guide/), [npm]).
- Don't use tsup. Its own README says it is "not actively maintained anymore" and points to tsdown ([github.com/egoist/tsup](https://github.com/egoist/tsup)).
- Keep Vite library mode for packages that need CSS or asset handling or the demo app only. Vite 8.3.5 [npm] doesn't produce `.d.ts` by itself.
- Mitigate the 0.x risk: pin a minor version (`~0.23.1`), enable `isolatedDeclarations` in tsconfig so declaration emit doesn't depend on the full TS type-checker API, and gate every release with `publint` (0.3.25) and `attw --pack` (0.18.5) [npm].
- Output ESM-only with an `exports` map and `"sideEffects": false`, and track min+gz budgets with `size-limit@14` [npm].
- Version and release with **Changesets** (`@changesets/cli@3.0.3`) [npm].
- **TypeScript:** run `typescript@7.0.2` (native, fast) for `tsc --noEmit` type-checking. Keep a TS 6.x toolchain, such as `@typescript/typescript6`, available for anything that needs the compiler API (typescript-eslint, api-extractor, some d.ts emitters), because TS 7.0 reportedly has no stable programmatic API ([linuxiac.com](https://linuxiac.com/typescript-7-0-rewrites-the-compiler-in-go-for-up-to-12x-faster-builds/), secondary source). Verify tsdown's d.ts path against TS 7 before relying on it; its peer range already allows `^7` [npm].

**(3) Test stack: Vitest 5, Playwright, axe-core and Biome.**

- **Unit tests:** `vitest@5` with `happy-dom` (21.0.4) for pure logic and DOM wiring [npm].
- **Anything timing-, layout- or WAAPI-dependent:** run in **Vitest Browser Mode with the Playwright provider** (`@vitest/browser-playwright`). Vitest docs recommend Playwright for parallel runs, and `preview` is not for CI ([vitest.dev/guide/browser](https://vitest.dev/guide/browser/)). happy-dom and jsdom have no layout engine.
- **E2E and visual tests:** `@playwright/test@1.64.1` across Chromium, Firefox and WebKit, so scroll-timeline, View Transitions and WebGPU fallbacks get exercised per engine.
- **Accessibility:** `@axe-core/playwright@4.14.0` as a devDependency only (MPL-2.0) [npm]. Also add explicit `prefers-reduced-motion` tests via Playwright `emulateMedia`.
- **Lint and format:** `@biomejs/biome@2.6.2` (MIT OR Apache-2.0, the same dual license as this project) for formatting and most linting ([biomejs.dev](https://biomejs.dev/), [npm]). Add ESLint 10 with typescript-eslint **only** if type-aware rules prove necessary. Note its dependence on the TS compiler API (see (2)).

**(4) three.js minimum version and optional WebGPU support.**

- Set `peerDependencies: { "three": ">=0.159.0" }`, with `@types/three` matched. This aligns with the strictest common floor in the pmndrs ecosystem: `@react-three/drei` requires `three >=0.159` and R3F 9 requires `>=0.156` [npm].
- Run CI against both **three 0.159.0** and **latest (0.186.1)** [npm]. three ships breaking changes in minor releases roughly monthly (r183 2026-02-18 → r186 2026-09-08 [npm `time`]).
- If the toolkit uses TSL or `three/webgpu` APIs in a package, raise **that package's** floor to the oldest release you test those APIs against. The floor above was not verified for TSL/WebGPU and must be confirmed in CI.
- **Make WebGPU an optional, opt-in path.** three's `WebGPURenderer` already falls back to WebGL 2 automatically when WebGPU is unavailable ([threejs.org docs](https://threejs.org/docs/pages/WebGPURenderer.html)), and TSL compiles to both WGSL and GLSL ([three.js wiki](https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language)).
  - WebGPU is not Baseline ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API)).
  - Safari macOS shows "partial" support and Firefox support varies by OS ([caniuse.com/webgpu](https://caniuse.com/webgpu); Firefox 141 Windows / 147 Apple Silicon per [secondary coverage](https://linuxiac.com/webgpu-lands-in-firefox-141-on-windows-eyes-linux-and-macos-next/)).
  - Default to `WebGLRenderer`. Expose a `renderer: 'webgpu' | 'webgl' | 'auto'` option, and keep `three/webgpu` imports in a separate entry point so WebGL-only users don't pay for them.
- For React, target `@react-three/fiber@^9` (React 19). Note its peer cap `react <19.4` [npm]. Don't depend on the R3F v10 alpha WebGPU work yet ([r3f docs](https://r3f.docs.pmnd.rs/getting-started/introduction)).
- **Asset pipeline:** `@gltf-transform/cli@4.5.1` with meshopt (`meshoptimizer@1.3.0`) as the default compression and KTX2 for textures. Support Draco (`draco3d@1.5.9`, Apache-2.0) for decoding only [npm]. Avoid the unofficial `basis_universal` npm wrapper [npm metadata].

**(5) License traps.**

| Item | Finding | Risk to an MIT/Apache library | Action |
|---|---|---|---|
| **GSAP** | The npm license field is a custom "Standard 'no charge' license" [npm]. Webflow is the licensor and can amend the terms. Use is prohibited in no-code visual animation tools that compete "with Webflow's visual animation building capabilities" without written consent. The page does not claim OSI or open-source status ([gsap.com/standard-license](https://gsap.com/standard-license)). | **It is not OSI-approved open source.** An MIT library may *reference* it as an **optional peer dependency** without redistributing it: the end user installs gsap and accepts its license. Never bundle or vendor GSAP code. **Never use GSAP inside any `@snowbros` visual editor or timeline GUI**, because that is the prohibited use. | Isolate it in `@snowbros/adapter-gsap`, state its license in the adapter README, and exclude it from the core and any studio/editor package. |
| **Theatre.js Studio** | `@theatre/studio` is **AGPL-3.0-only** [npm]. The repo applies AGPL v3 to `theatre/studio/...` and Apache-2.0 to the rest ([LICENSE](https://github.com/theatre-js/theatre/blob/main/LICENSE)). `@theatre/core` is Apache-2.0 [npm]. Both last released 2024-05-19 [npm]. | Bundling or re-exporting Studio into a published package or a hosted page triggers AGPL obligations, including the network-use clause. Core is safe but stagnant. | Allow at most an optional `@theatre/core` playback adapter. Studio may be a **devDependency for local authoring only**: never a dependency or peer, and never in production builds. Prefer our own JSON timeline format. |
| **Rive** | The runtime `@rive-app/canvas` and `@rive-app/react-canvas` are MIT [npm], and rive-wasm's LICENSE is MIT ([LICENSE](https://github.com/rive-app/rive-wasm/blob/master/LICENSE)). | **The runtime is low risk.** The license of the Rive editor and of `.riv` assets was not verified in this session. Assets carry their authors' rights. | Optional `@snowbros/adapter-rive` peer. Don't ship third-party `.riv` files without explicit licenses. |
| **`@axe-core/playwright`** | MPL-2.0 [npm] | File-level copyleft. Fine as a devDependency. | Keep it in devDependencies only. |
| **`ogl`** | Unlicense [npm] | Public-domain dedication, compatible | OK |
| **`lit`** | BSD-3-Clause [npm] | Permissive, compatible | OK. Preserve the notice. |
| **`react-aria`, `style-dictionary`, `draco3d`, `@playwright/test`, `typescript`** | Apache-2.0 [npm] | Compatible with MIT OR Apache-2.0 | Keep the NOTICE files if vendoring (we shouldn't vendor). |
| **`@biomejs/biome`** | MIT OR Apache-2.0 [npm] | Identical to ours | OK |

---

## 7. Command log and gaps

- All `npm view` commands succeeded for the 48 packages queried. `npm` printed a warning (`Unknown project config "link-workspace-packages"`) that did not affect the results.
- npm metadata has **no `repository.url`** for `@gltf-transform/core`, `@gltf-transform/cli` or `basis_universal`.
- **Not measured:** min+gz bundle sizes for any package.
- **Not fetched:** the Flutter, SwiftUI and Compose doc pages; the official TypeScript 7.0 GA blog post (secondary sources were used); MDN's Baseline badge for the WAAPI overview page (it was absent from the fetched content); Rive editor terms.
- **Open conflict:** caniuse marks Firefox WebGPU "disabled by default", while release-note coverage reports it shipped on Windows (141) and Apple Silicon (147). Re-check https://github.com/gpuweb/gpuweb/wiki/implementation-status before you publish support claims.
