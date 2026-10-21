# Live inspection notes — reference sites

- **Date inspected:** 2026-10-21
- **Method:** Playwright MCP (Chromium, headless, DPR 1). For each site: navigate, then `browser_evaluate` to list `document.scripts`, `performance.getEntriesByType('resource')`, canvases and window globals. Same-origin JS bundles were re-fetched in the page and searched for library strings. Screenshots taken at the top of the page and after `window.scrollTo` (or `lenis.scrollTo(..., {immediate:true})` on Lenis sites) plus a wait of about 1.5 s. Mobile checked at 390x844.
- **Screenshots:** `docs/research/screens/`
- **Labels:** OBSERVED = I saw it happen in the browser. VERIFIED = code or network evidence, with the URL or string cited. INFERRED = a reasoned guess, with the reason given. UNKNOWN = not determined.
- **Caveats:**
  - Resource counts below include extra requests caused by my own bundle re-fetches, so treat them as approximate.
  - Cross-origin `transferSize` reads as 0 when the server sends no `Timing-Allow-Origin` header.
  - Headless Chromium at DPR 1 means device-tier branches (deviceMemory, hardwareConcurrency) may differ from real phones.
  - Playwright also wrote its own snapshot and console logs into `.playwright-mcp/` in the project root. That is tool output, not research content.

---

## 1. CVNT — https://cvnt.in/ (primary)

**What worked:** everything. Page load, bundle search, scroll screenshots, preloader capture (after clearing sessionStorage) and the mobile viewport.
**What failed:** nothing was blocked. The CSP blocked one Meta Pixel endpoint, which is a console error only.

### VERIFIED

- **Framework: Next.js App Router with React Server Components streaming.**
  - Inline `self.__next_f.push(...)`, `/_next/static/chunks/main-app-*.js`, `app/page-d46e8f28d46d5e5f.js`, `app/layout-*.js` and route-group chunks (`app/(app-shell)/...`).
  - `window.next` is present and there is no `__NEXT_DATA__`, which means it is not the Pages Router.
  - Styling is Tailwind utility classes (e.g. `h-[420vh] min-h-[420svh]`, `text-[clamp(3.6rem,17.5vw,9.6rem)]`) plus CSS Modules (`HomeMaskRevealSection_section__U3LJX`, `TextShimmer_shimmer__8uLHv`).
  - Fonts come from `next/font` (`__variable_*` body classes).
- **3D: plain three.js r171, not React Three Fiber.**
  - `window.__THREE__ === "171"`, and both canvases carry `data-engine="three.js r171"`.
  - No `@react-three`, `__r3f` or `useFrame` strings in any loaded chunk. The renderers are created by hand inside React `useEffect`, e.g. `new WebGLRenderer({canvas, antialias, alpha, powerPreference})` in `79605.4409dcbffebfb13d.js` and `69016.c50da569affc9d38.js`.
  - The three.js core is split into lazy chunks `b536a0f1.*.js` (about 80 KB gzip) and `bd904a5c.*.js` (about 97 KB gzip). They load at about 3.9 s, after first paint (script initiator, dynamic import).
- **Canvas 1, hero background (section-01):** a three.js `Points` cloud.
  - 950 random points on a cylinder-like shell, size 0.01, opacity 0.18, slow y-rotation. Chunk `69016`.
  - Canvas CSS: `pointer-events-none absolute inset-0 -z-10 opacity-70`.
  - Quality tiers:
    - It reads `navigator.deviceMemory` and `hardwareConcurrency` plus `(max-width: 767px)`.
    - On low tier it turns antialias off, uses `powerPreference:"low-power"`, caps DPR at 1.2 (otherwise 1.7) and throttles to 36 fps (otherwise 60): `M=d?1e3/36:1e3/60`.
    - It reads `matchMedia("(prefers-reduced-motion: reduce)")` and pauses when `visibilityState` is not visible.
- **Canvas 2, product pouch (section-02):** one glTF model.
  - `/models/packaging.glb` (about 515 KB transferred, 599 KB decoded), loaded with `GLTFLoader.loadAsync("/models/packaging.glb")` (chunks `79605`, `98949`).
  - The GLTFLoader chunk `19323.*.js` includes DRACO, KTX2 and Meshopt hooks. These are stock GLTFLoader code. No .drc or .ktx2 file was requested, so the model does not appear to use them.
  - Lighting: an inline RoomEnvironment-style procedural scene fed to `PMREMGenerator.fromScene(..., .03)` and set as `scene.environment`. There is no HDR file.
  - Rendering: tone mapping with tiered `toneMappingExposure` (.46/.52/.58) and tiered `setPixelRatio(min(dpr, 1.18–1.85))`.
  - Lights: animated with `sin`/`cos` of elapsed time (subtle light drift).
  - Assets: a `getPackagingModelAssets("fast"|"full")` loader picks the texture set by tier. When a map is missing it falls back to flat generated colors (e.g. normal map `128,128,255`).
  - Interaction:
    - Pointer drag with `setPointerCapture`, plus inertia via `MathUtils.lerp` and `MathUtils.damp` (separate damping factors while dragging and when released).
    - Clamped tilt (`±1.04`, `±0.5`), auto-spin when idle, and a passive `wheel` listener.
  - Robustness:
    - `IntersectionObserver` (threshold .01) pauses rendering offscreen.
    - Listens for `webglcontextlost` and `webglcontextrestored`, and pauses on `visibilitychange`.
    - Uses a `ResizeObserver`/`getBoundingClientRect` resize path.
  - The page chunk preloads this module and its assets ahead of time: `Promise.all([n.e(61831), n.e(89367), n.e(19323), n.e(79605)])`, then calls `getPackagingModelAssets(...)`.
- **Scroll technique: native scroll. No Lenis, Locomotive or smooth-scroll library.**
  - `html` has no `lenis` class and `scroll-behavior` is `auto`. No lenis or locomotive strings appear in any chunk.
  - Pinning is CSS `position: sticky` inside very tall sections: section-02 is `h-[420vh]` on mobile, 390vh at sm and 360vh at md, with a child `sticky top-0 h-screen min-h-[100svh]`. section-02b has the same pattern.
  - Scroll-linked animation is hand-written.
    - A `scroll` listener with `{passive:!0}` schedules one `requestAnimationFrame` per frame. Inside it, `getBoundingClientRect()` gives a progress value `(vh - rect.top)/(vh + rect.height)`.
    - That progress goes through a piecewise easing curve (breakpoints .133/.4/.695) and is written as `el.style.transform = "scale(" + v.toFixed(4) + ")"`.
    - Seen in `app/page-d46e8f28d46d5e5f.js`.
  - Gallery tiles in section-02b have inline `transform-origin: left bottom` or `right bottom` and `transform: scale(0..1)`, with `will-change: transform`.
- **GSAP 3.14.2 is loaded on the homepage but probably not used there** (`c15bf2b0-*.js` holds the core, `47605-*.js` has CSSPlugin and `registerPlugin`).
  - It arrived in the same dynamic-import batch as three, at about 3.87 s.
  - ScrollTrigger usage is VERIFIED only in other route chunks:
    - `app/career|contact/page-*.js`: `scrollTrigger:{trigger:".career-header",start:"top top",end:"bottom top",scrub:1,pin:!0}`
    - `app/model/page-*.js`: `rotationX:"+=1080"` with scrub.
  - The homepage page chunk itself contains no `gsap` string.
- **Preloader:**
  - Uses the sessionStorage key `cvnt.preloader.shown`.
  - Runs only on routes `"/"` and `"/model"`.
  - Config flags `preloaderEnabledDesktop:!0, preloaderEnabledMobile:!1` (desktop only).
  - Shows a list of greetings ("namaskar" in many Indic scripts) and has an SVG path builder (`"M0 0 L"...`), probably a wipe or reveal shape.
- **Nav shift persistence:** an inline script reads sessionStorage `cvnt.heroNavShift` before hydration to set `--hero-nav-shift` on `<html>`, which avoids a layout jump.
- **Fonts:** Inter (variable 100–900), DM Serif Text (italic display words such as _more._ and _proof_), Cal Sans, and "TietopOi". Two preloaded `.woff2` files (344 KB and 37 KB) and two `.ttf` files.
- **Media:** about 22 `.webp` product and gallery images, under `/media/products/...`. No video elements and no image sequences. The page chunk contains a video-extension whitelist (`.mp4 .webm .mov .m4v .ogv .ogg .m3u8`) for product media, but no video loaded on the home page.
- **prefers-reduced-motion:**
  - The global CSS reset `7912422ad3221708.css` sets `@media (prefers-reduced-motion:reduce){*,:after,:before{animation-duration:.01ms!important;transition-duration:.01ms!important;...}}`.
  - About 30 component-level reduced-motion rules across the CSS modules.
  - The JS check in the hero particle canvas.
- **Source maps:** not public. `*.js.map` requests for page, three and model chunks return 404, and the CSS has no `sourceMappingURL`.
- **Other:**
  - The cart and auth layer is a separate non-React bundle (`/cart-assets/cart.min.js?v=40`, `window.__CVNT_CART_CONFIG__`).
  - Analytics: GA4, Clarity, Meta Pixel.
  - The CSP lists Supabase, Razorpay and PostHog. `badge.glb` and `lanyard3.png` are referenced in a shared chunk (a lanyard or badge feature, probably on another route) and were not loaded on the home page.

### OBSERVED

- **First visit, desktop:** a white full-screen preloader cycles greetings in different scripts (`cvnt-desktop-preloader-a.png`, `-b.png`). It clears within about 2–3 s to the hero (`-c.png`).
- **Repeat visits in the same session skip it.** On mobile at 390px no preloader appeared, which matches the config flag.
- **Hero:** a cut-out model photo in front of a huge gradient "001" numeral, with the faint particle field behind (`cvnt-desktop-00-load.png`, `cvnt-mobile-00-top.png`).
- **Section-02:** the headline "all that you deserve. and some _more._" stays pinned while a 3D textured pouch (newspaper or map print) scrolls up through and over the text, rotating (`-01-y1000`, `-02-y1800`, `-03-y2600`, `cvnt-mobile-02-pouch.png`). The pouch canvas itself scrolls with the document; only the text is sticky.
- **Section-02b:** "the proof writes itself." is pinned while UGC photo tiles scale up from alternating bottom corners and pass over it in a staggered grid (`-05-y4700`, `-06-y6200`, `-07-y7600`).
- **Product strip:** cut-out cats wearing the jewellery, with name, colour and price (`-08-y8500`).
- **Footer:** a fixed footer is revealed from behind the content (fixed `bottom-0 z-0` layer plus a `100svh` pointer-events-none spacer `#site-footer`), with an orange gradient and a big "c✱nt" wordmark (`-09-bottom`).
- **Floating CTA:** a pill "EXPLORE PRODUCTS" stays fixed top-right after the hero.
- **Mobile:** both three.js canvases are still created at 390px, and the pouch still renders.

### INFERRED

- **The preloader likely exits with an SVG path or clip wipe.** Reason: the path builder sits next to the preloader constants. I did not capture the exit transition frame by frame.
- **The pouch's vertical travel is driven by the document scroll, not a scroll-to-3D-camera mapping.** Reason: the canvas `top` changes 1:1 with scrollY (+356 to -331 across 800 px), and the 79605 chunk has no scroll listener, only pointer, wheel and time. The rotation seen while scrolling is the idle auto-spin and damped motion.
- **GSAP on the home page is a shared-chunk side effect**, not the home choreography. Reason: same import batch as three, and there is no gsap reference in the home page chunk.
- **The device-tier heuristics exist to protect mid- and low-end Android, a big share of Indian mobile traffic.** Reason: thresholds such as `hardwareConcurrency<=6` and `deviceMemory<=4` and the 36 fps cap.

### UNKNOWN

- Exact poly count and texture formats inside `packaging.glb` (not downloaded or parsed).
- Whether the mask-reveal section (`HomeMaskRevealSection`, `aria-hidden`) uses CSS `mask-image` or a canvas. It was empty or decorative when I sampled it.
- Exact preloader timing and easing.

### Transferable techniques

1. **Sticky-in-tall-section pinning** (`height: 360–420vh` with `sticky top-0 h-[100svh]` inside) instead of a pinning library. It works with native scroll and is robust on mobile.
2. **One rAF-throttled passive scroll listener** that maps `getBoundingClientRect` to a 0–1 progress, then a piecewise easing curve, then writes `transform` directly. No React state per frame.
3. **Corner-anchored `scale()` reveals** (alternating `transform-origin: bottom left` and `bottom right`) for an editorial photo-wall feel.
4. **Vanilla three.js inside `useEffect`** for one hero object, with no R3F overhead. Lazy-load three after first paint, and preload the model module and assets in parallel.
5. **Device-tier quality ladder:**
   - Signals: deviceMemory, hardwareConcurrency, viewport width, saveData.
   - Settings it drives: antialias, powerPreference, DPR cap, fps cap, exposure and texture set ("fast"/"full").
6. **RoomEnvironment plus PMREM** for studio reflections with no HDR download.
7. **Drag-to-spin with damped inertia** (`MathUtils.damp`) and clamped tilt. Idle auto-rotate resumes after release.
8. **Render hygiene:** IntersectionObserver pause, `visibilitychange` pause, WebGL context-loss handlers, and a `prefers-reduced-motion` check.
9. **Session-once preloader** (sessionStorage flag), desktop only, route-whitelisted.
10. **Fixed-footer reveal** using a `100svh` spacer.
11. **Global reduced-motion CSS reset** plus per-component overrides.

### Do not copy

- The brand: "c✱nt" wordmark, "001" hero numeral treatment, copy lines ("not for everyone, clearly.", "the proof writes itself."), photography and models, product imagery, cat cut-outs, the newspaper/map pouch texture and the `packaging.glb` asset.
- The exact easing breakpoint constants and the specific hero composition (cut-out portrait over a giant numeral) as a recognizable layout.
- The greeting-cycle preloader content and sequence as-is. Re-imagine it for our own identity.
- Any minified source beyond the short identifying strings above.

---

## 2. Lando Norris — https://landonorris.com/

**What worked:** load, globals, bundle search, scroll screenshots (via `window.lenis.scrollTo`) and mobile.
**What failed:** asset sizes for cross-origin files read as 0 KB (no Timing-Allow-Origin header), so sizes are unknown.

### VERIFIED

- **Platform: Webflow.** `<html data-wf-domain="landonorris.com" data-wf-site=... class="w-mod-js lenis">`, `window.Webflow`, jQuery 3.5.1 from the Webflow CDN, and assets on `cdn.prod.website-files.com`.
- **Custom app bundle hosted by the studio:** `https://lando.itsoffbrand.io/dev-js/lando-by-OFF+BRAND.05.js` (about 1.3 MB unminified-size text). The asset base `assets.itsoffbrand.io/lando/` points to the agency OFF+BRAND.
- **Libraries:**
  - GSAP: `window.gsapVersions = ["3.13.0"]`, with ScrollTrigger and SplitText strings in the bundle.
  - Lenis smooth scroll: `window.lenisVersion = "1.1.20"`, `window.lenis` present, `smoothWheel`, `syncTouch` options.
  - Taxi.js page transitions: `data-taxi-ignore` and the `"X-Requested-With":"Taxi"` header.
  - Rive: `@rive-app/canvas-lite@2.26.4/rive.wasm` from unpkg.
  - three.js r174: `window.__THREE__ === "174"` and a canvas `.gl` with `data-engine="three.js r174"`, full viewport.
- **3D assets:**
  - `gl/models/helmet-21.glb`, `disco-02.glb`, `tracks/tracks-06-test.glb`
  - DRACO decoder (`gl/draco/draco_decoder.wasm`, `draco_wasm_wrapper.js`); KTX2Loader strings are present.
  - HDRIs `studio_small_08_1k--light.hdr` and `--faded.hdr`.
  - EffectComposer (post-processing) strings.
- **WebGL text:** MSDF font atlases `gl/fonts/Brier-Bold-msdf.json` and `MonaSans-Bold-msdf.json` (+ `.webp` atlases).
- **Rive files:** `page-transition.riv`, `signature.riv`, `btn-ui.riv`, `circuits.riv`, `reef.riv`, `phrases.riv`, `ln4.riv`, `mob-landscape.riv`. About 21 `<canvas>` elements in total, most of them small Rive canvases.
- **Fonts:** Brier (display serif-ish) and Mona Sans Variable.
- **prefers-reduced-motion:** one hit, in the Webflow chunk `lando-offbrand.schunk.*.js`. No hit in the main OFF+BRAND bundle.
- **Source map:** `lando-by-OFF+BRAND.05.js.map` returns 404.

### OBSERVED

- **Hero:** a portrait of Lando with a 3D helmet (wireframe and visor) partially overlaid. A cursor-driven reveal of the helmet over the face, with topographic contour lines in the background (`lando-desktop-00-top.png`).
- **Mobile:** the same hero with a "TAP TO LOCK" control, a touch adaptation of the hover reveal (`lando-mobile-00-top.png`).
- **Scroll:** marquee rows of big type ("…DID IT AT…", "…BRITISH G…") with a neon-yellow signature (Rive) drawing over a photo. The theme switches to dark olive (`lando-desktop-01-y1200.png`).
- **Further down:** a floating, scattered photo collage with captions on a muted green background, a quote and a small signature (`-02-y3500`). Then a full-bleed "HELMETS" section (`-03-y7000`).
- No ScrollTrigger `.pin-spacer` elements at the sampled positions. 4 `position: sticky` elements were present.

### INFERRED

- **One full-screen three.js canvas is the persistent WebGL layer across sections** (helmet, disco ball, track lines), synced to Lenis and GSAP. Reason: there is a single viewport-sized `.gl` canvas, and models load at startup.
- **The MSDF fonts mean some headline text renders in WebGL**, probably for the distortion and reveal effects.

### UNKNOWN

- Asset byte sizes. Whether `tracks-06-test.glb` is used visibly. The exact post-processing passes.

### Transferable techniques

- Webflow as the CMS and layout shell, with an externally hosted custom JS bundle for WebGL, Lenis and GSAP (a clean split between designers and developers).
- One persistent full-screen WebGL canvas behind DOM content, plus HDRI lighting and DRACO-compressed GLBs.
- Rive for vector micro-animations (signature draw, buttons, page transition), which are cheaper than video or Lottie for interactive state.
- Hover-to-reveal 3D over a photo, with a touch-specific "tap to lock" fallback on mobile.
- MSDF text in WebGL for type that has to live inside the 3D scene.

### Do not copy

- Lando's likeness, helmet designs, signature, McLaren and sponsor marks, the LN4 logo, the Brier and Mona Sans pairing as a whole look, the topographic-line art direction, and OFF+BRAND's bundle code and assets.

---

## 3. Messenger (Abeto) — https://messenger.abeto.co/

**What worked:** load, bundle search, network assets, title screen screenshot.
**What failed or was limited:**
- I did not click "BEGIN" because it starts the audio and game session, so in-game behavior was not inspected.
- On mobile (390x844) the page was still on the "LOADING" screen after about 6 s (`abeto-mobile-00-load.png`).
- `document.querySelectorAll('canvas')` returned 0 even while the 3D title rendered. Cause UNKNOWN.

### VERIFIED

- **Build:** Vite-style hashed assets (`/assets/App3D-DwM1eiaC.js`, about 1.9 MB) and Svelte 5 (`window.__svelte` with `PUBLIC_VERSION="5"`).
- **3D:** three.js r180 (`window.__THREE__ === "180"`), WebGL2 context creation path, `BatchedMesh` and `InstancedMesh` heavy, `EffectComposer`.
  - KTX2Loader with `assets/libs/basis/basis_transcoder.js`; 10 `.ktx2` textures.
  - DRACO with 15 raw `.drc` geometry files, e.g. `assets/geometries/planets/present/intro/planet.drc` at about 329 KB.
- **Workers:** `glyphworker-*.js`, `dracoworker-*.js`, `bitmapworker-*.js`, `geometryworker-*.js`. Geometry, decoding and text are moved off the main thread.
- **Multiplayer:** a WebSocket client with `servers:["wss://multiplayer-server-76608060529.us-central1.run.app"]` and `"permessage-deflate"`.
- **Audio:** 53 `.ogg` files (music `bgmusic-highq.ogg` about 2.2 MB, ambiences per biome, footsteps, UI, dialogue barks) and Web Audio (`AudioContext`).
- **Detection:** feature detection for `transferControlToOffscreen` / `OffscreenCanvas` (`offscreenCanvas:!!HTMLCanvasElement.prototype.transferControlToOffscreen`).
- **Source map:** a request for `App3D-*.js.map` returned `200 text/html`, which is the SPA fallback page, not a real map. So no public source map, as far as this check shows.

### OBSERVED

- **Title screen:** a toon-shaded tiny planet (houses, trees, water, cables) behind chunky 3D "MESSENGER" letters and a yellow "BEGIN" button on a teal background with floating particles (`abeto-desktop-00-load.png`).
- **Mobile loader:** a hand-drawn envelope "LOADING" screen.

### INFERRED

- **Rendering may use OffscreenCanvas in a worker**, or a canvas the page does not expose in the light DOM. Reason: zero canvases in the DOM, plus the OffscreenCanvas detection and the worker set. Not confirmed.
- **It is a small multiplayer web game**, not a scroll site. Reason: character physics events (`character_physics_land`), dialogue audio and the wss server.

### UNKNOWN

- Gameplay, controls and camera system. Whether mobile eventually loads.

### Transferable techniques

- Raw `.drc` geometry plus KTX2/Basis textures, decoded in dedicated workers.
- `BatchedMesh` and `InstancedMesh` for many props.
- Svelte 5 as a thin UI layer over an imperative three.js app.
- A designed loader and title screen that also unlock audio on the first user gesture.

### Do not copy

- Abeto's art style, the planet and title lettering, character designs, audio, and their multiplayer endpoint.

---

## 4. Theatre.js — https://www.theatrejs.com/ (stack only)

**What worked:** load, bundle search, network.
**What failed:** nothing.

### VERIFIED

- **Next.js Pages Router:** `<script id="__NEXT_DATA__">` with buildId `XVulu8M4Opvscv3w5JvSn`, `/_next/static/chunks/pages/_app-*.js`, `pages/index-*.js`.
- **No three.js on the marketing homepage:** `window.__THREE__` undefined and no `<canvas>`.
- **The `@theatre/core`, `@theatre/studio` and `@react-three` strings in chunk `352-*.js` (about 3.7 MB) are bundled docs content (MDX)**, e.g. "Upgrade by running `npm install @theatre/core@latest @theatre/studio@latest @theatre/r3f@latest`". They are not the runtime library.
- **Hero video is streamed from Mux over HLS:** `stream.mux.com`, `image.mux.com`, Fastly/Cloudflare Mux CDNs, 19 `.m3u8` and 13 `.ts` segment requests, plus `.vtt`.
- A console 404 for `/fonts/virgil.woff2`, which is preloaded but missing.

### OBSERVED

- A dark landing page, "Powerful motion design in the browser", with a large video player showing a Theatre.js 3D title demo (`theatrejs-desktop-00-top.png`).

### INFERRED

- The site shows Theatre.js through recorded video rather than live WebGL on the landing page. Reason: no canvas and Mux HLS only.

### Transferable techniques

- For a toolkit's marketing page, show heavy 3D demos as adaptive-bitrate video (HLS via Mux) and keep live WebGL for the docs and examples.

### Do not copy

- Theatre.js branding, demo footage and docs content.

---

## Cross-site summary

| Site               | Framework                     | 3D                                     | Scroll                            | Motion libs                | Assets of note                           |
| ------------------ | ----------------------------- | -------------------------------------- | --------------------------------- | -------------------------- | ---------------------------------------- |
| cvnt.in            | Next.js App Router + Tailwind | vanilla three r171 (2 canvases)        | native + CSS sticky + custom rAF  | GSAP 3.14.2 (other routes) | 1 GLB, procedural env, webp              |
| landonorris.com    | Webflow + external bundle     | three r174, full-screen                | Lenis 1.1.20 + GSAP ScrollTrigger | GSAP 3.13, Rive, Taxi.js   | 3 GLB (DRACO), 2 HDR, MSDF fonts, 8 .riv |
| messenger.abeto.co | Vite + Svelte 5               | three r180, Batched/Instanced, workers | n/a (game)                        | —                          | 15 .drc, 10 .ktx2, 53 .ogg, wss          |
| theatrejs.com      | Next.js Pages Router          | none on landing                        | native                            | —                          | Mux HLS video                            |
