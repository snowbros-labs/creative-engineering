# SNOWBROS — Reference Research Notes

Checked: 2026-10-21 (all "date checked" values below are this date unless noted).
Scope: about 20 references across 8 categories, a synthesis of 14 principles, and functional vs expressive motion tokens.

**Evidence quality legend**
- **FETCHED**: page fetched with WebFetch on 2026-10-21. The claims come from the text that came back. WebFetch returns converted text, not raw HTML, so script tags and framework markers often do not appear.
- **CASE STUDY**: an official write-up by the studio or company, fetched.
- **THIRD-PARTY**: someone else's write-up, a forum post or search snippet.
- **MEMORY-ONLY**: not verified this session. Treat as a hypothesis.
- Stack claims are tagged **SEEN** (named in fetched text or visible in fetched URLs) or **INFERRED** / **UNKNOWN**.

**Starting-point notes**
- awwwards.com/websites (FETCHED): the current Sites of the Day include Ascension (Jesper Landberg, Oct 21), Cartier "Le Chœur des Pierres" (makemepulse, Oct 20), FORMAT (Obys), Santioni Spirits (Active Theory) and Butter (ToyFight). The list page carries no per-site tech tags.
- godly.website now 301-redirects to `recent.design/?ref=godly`, which I did not explore. thefwa.com returned only its title, so I could not pick references there. I did not fetch cssdesignawards.com. I therefore chose references mostly from official case studies and documentation, not from award galleries.

---

## 1. Immersive 3D/WebGL experiences

### 1.1 Igloo Inc. (Abeto + Bureaux), Awwwards Site of the Year 2024

- URL: https://www.igloo.inc · Case study: https://www.awwwards.com/igloo-inc-case-study.html
- Evidence: CASE STUDY (fetched).
- Distinctive: a scroll-driven 3D site in three sections. Each portfolio company is a procedurally grown ice block. The links section is a particle simulation that re-forms into a different shape for each link, with sound synced to the particles.
- IA and interaction: linear scroll through project objects. Exits to external links are the climax, not buried in a footer.
- Techniques: procedural ice-crystal growth (Houdini); a custom VDB-to-browser volume exporter with compression; the intro rendered in-engine instead of as pre-rendered video, which keeps files small; **the UI itself rendered in WebGL** (glitch and scramble text through SDF texture offsets) to avoid DOM layout and masking costs; texture loading and shader compilation staged at first load and in the background.
- Stack (SEEN in the case study): Three.js, three-mesh-bvh (written "three-mesh-bhv"), Svelte, GSAP, Vite, vanilla JS; Houdini, Blender, Figma, Photoshop, Affinity Photo, DaVinci Resolve.
- Transferable: stage shader compilation and texture upload so the first interaction does not stall; measure on low-end devices throughout the build, not at the end.
- Do not copy: WebGL text is invisible to screen readers and search engines unless you mirror it in the DOM. Do not use it for content that has to be read.
- SaaS/docs transfer: staged or deferred loading of heavy modules; prewarm expensive work (for example, warm the chart renderer during idle time).

### 1.2 Lusion (studio site)

- URL: https://lusion.co
- Evidence: FETCHED (text only).
- Distinctive: a studio site built around full-screen 3D storytelling. The work grid shows projects such as "Porsche: Dream Machine", "Devin AI" and "Meta: Spatial Fusion". R&D lives on a separate subdomain (labs.lusion.co).
- IA and interaction: hero → approach / Play Reel → featured work (10 cards with category tags) → CTA → footer. The page repeats explicit prompts such as "scroll to explore" and "CONTINUE TO SCROLL", and has Play/Mute controls for the reel and audio.
- Techniques: keeps experiments on Labs so the main site stays focused; tells the user what to do next when the scroll is long.
- Stack: UNKNOWN. The fetched text has no script fingerprints. WebGL is INFERRED from the content.
- Transferable: separating experiments from the product site is a useful pattern; visible audio controls with an explicit mute.
- Do not copy: "keep scrolling" prompts are a sign the page is too long for content that has to be found quickly.
- SaaS/docs transfer: low. The transferable part is the IA discipline: a showcase on one route, experiments on another.

### 1.3 Bruno Simon, Folio 2025

- URL: https://bruno-simon.com · Repo: https://github.com/brunosimon/folio-2025
- Evidence: FETCHED (README).
- Distinctive: a driveable 3D world with weather, day and year cycles, terrain, foliage, water and physics objects.
- IA and interaction: exploration with game controls. Content is placed inside the world.
- Techniques: **an ordered game loop.** Systems run in numbered stages (0–999) with declared dependencies, and physics is split into pre- and post-physics steps. An `npm run compress` pipeline turns GLB files and textures into GPU formats (KTX2/ETC1S). Repeated objects are instanced.
- Stack (SEEN): Three.js, Blender export presets, glTF-Transform, KTX-Software (`toktx`), WebP, Vite config file present. Physics engine and WebGPU use: UNKNOWN from the README.
- Transferable: **one scheduler for everything per frame**, with explicit order; asset compression as a scripted build step, not a manual one.
- Do not copy: the game-world navigation model for anything people need to find quickly.
- SaaS/docs transfer: one rAF/ticker for all animated widgets on a dashboard (sparklines, live counters) instead of a separate loop per component.

---

## 2. Premium SaaS apps and complex dashboards

### 2.1 Linear (app redesign)

- URL: https://linear.app/now/how-we-redesigned-the-linear-ui (part II)
- Evidence: CASE STUDY (fetched).
- Distinctive: a calm, dense, keyboard-driven issue tracker. The redesign mostly changed the global chrome, which the article calls the "inverted L" (sidebar plus header) that frames the main view.
- IA and interaction: the sidebar and tabs control a single main view. Back/forward, history and tabs are built so they can be removed, which lets the same UI run in the browser and in the Electron app.
- Techniques: **theme generation in LCH.** Three inputs (base color, accent color, contrast) replace "98 specific variables" per theme. Light and dark themes come from the same generator. A contrast input enables high-contrast themes. Inter Display is used for headings and Inter for body text. Alignment of icons, labels and buttons was tightened to reduce noise.
- Stack (SEEN): Electron, Figma, Inter, Inter Display. Web framework UNKNOWN from this article. The "sync engine" talk page (https://linear.app/now/scaling-the-linear-sync-engine, fetched) is a video intro only, so local-first and optimistic-update claims are MEMORY-ONLY.
- Transferable: generate themes from a few perceptual inputs instead of hand-tuning tokens; build density through alignment and hierarchy, not by shrinking type.
- Do not copy: pure dark-gradient marketing styling on product screens.
- SaaS/docs transfer: direct. A token generator (base / accent / contrast) is a strong SNOWBROS feature candidate.

### 2.2 Vercel dashboard

- URL: https://vercel.com/blog/dashboard-redesign
- Evidence: CASE STUDY (fetched). **This is an older post.** It describes an earlier generation of the dashboard, not today's UI.
- Distinctive: deployment-centric IA, with production separated from preview deployments.
- IA: Dashboard → Projects (each card shows a screenshot of its latest production deploy) → Project (production vs previews, filterable by team member) → Deployment (logs filterable by function or build output, one-click copy, commit/author/branch metadata) → Domains.
- Techniques: preconnect to API, asset and avatar origins; raise the browser priority of critical API calls; memoization (`useMemo`, `useCallback`); `ReactDOM.unstable_batchedUpdates`; SWR for live data. Reported results: First Meaningful Paint more than 1.2 s faster and 20% fewer re-renders.
- Stack (SEEN): React APIs and SWR as named above.
- Transferable: put the latest real artifact (a screenshot) on the object card; prioritize critical requests; stale-while-revalidate for live status.
- Do not copy: the specific React APIs, which are dated. Copy the principles.
- SaaS/docs transfer: direct.

### 2.3 Raycast (marketing site for a keyboard-first tool)

- URL: https://www.raycast.com
- Evidence: FETCHED.
- Distinctive: the product's interaction model (launcher, hotkeys, aliases, snippets) is the marketing device. Keyboards rendered as keycaps and a mock AI chat UI mirror the command palette.
- IA: hero → keyboard showcase → extensions grid with category anchors → AI → testimonials → feature showcases → community → developers → footer.
- Stack (SEEN as URL fingerprints): Next.js (`/_next/image?url=…`, `/_next/static/immutable/media/…` with hashed filenames). Also seen: some icons have empty alt text and avatars have generic "Avatar" alt text, which is an accessibility gap.
- Transferable: show the real UI with real copy instead of abstract illustration; teach shortcuts in context.
- Do not copy: generic or empty alt text.
- SaaS/docs transfer: a command palette (⌘K) as the universal action layer; shortcut hints rendered as keycaps inside menus.

---

## 3. Editorial, typography-led and minimal sites

### 3.1 Stripe Press

- URL: https://press.stripe.com
- Evidence: FETCHED (first 100k of 533k characters).
- Distinctive: a book catalog treated as a publication. Every title follows the same template: description, purchase buttons by retailer, author bio, Praise, Reviews. It also covers a film and a podcast with transcripts.
- Interaction: link-driven browsing. Retailer options appear as parallel buttons with prices. The newsletter form validates inline and shows status messages. `<audio>` elements have fallback text.
- Stack (SEEN as URL fingerprints): images from `images.stripeassets.com` with `?q=80`, `fm=webp`, `w=1000` (image CDN with format negotiation). Framework UNKNOWN. The well-known 3D bookshelf of earlier versions is MEMORY-ONLY and did not appear in the fetched text.
- Transferable: a strict per-item template is what lets editorial richness scale; transcripts alongside media.
- Do not copy: assume nothing about typefaces. The fetch did not reveal them.
- SaaS/docs transfer: templated detail pages (entity → description → actions → related) work well for settings and resource pages.

### 3.2 Rauno Freiberg, "Invisible Details of Interaction Design"

- URL: https://rauno.me/craft/interaction-design
- Evidence: FETCHED (essay). The page is a minimal, typography-led essay with embedded demos.
- Distinctive: a canonical essay on why interactions feel right. The page itself is an example of restrained editorial layout.
- Key ideas (from the fetched essay): reuse metaphors; kinetic physics that keeps gesture momentum; "Truly fluid gestures are immediately responsive" and interruptible; reversible actions can fire mid-gesture, destructive ones should wait until the gesture ends; frequent actions need little or no motion because the novelty wears off; spatial consistency ("where it is spatially"); Fitts's law; implicit input.
- Stack: UNKNOWN.
- Transferable: the frequency-vs-novelty rule is the single most useful heuristic for separating SaaS motion from marketing motion.
- Do not copy: n/a. It is a principles source.
- SaaS/docs transfer: very high.

### 3.3 Wikipedia Vector 2022 (editorial at scale; also fits category 7)

- URL: https://www.mediawiki.org/wiki/Reading/Web/Desktop_Improvements
- Evidence: FETCHED (project page).
- Distinctive: typography and readability changes evaluated with data on one of the most-read sites in the world.
- Changes: **limited content width** (to shorten long lines; full/limited toggle added Nov 2022, made persistent for logged-out users Feb 2023); sticky header (Jan 2022); persistent table of contents (May 2022); collapsible sidebar; new search; language switcher.
- Outcomes (SEEN): less time spent scrolling, searching and navigating; "no negative effects to pageviews, account creation, or edit rates."
- Stack: MediaWiki (SEEN: the project concerns the Vector skin).
- Transferable: cap line length and let the user override it; a persistent TOC on long documents; ship incrementally and measure each change.
- Do not copy: n/a.
- SaaS/docs transfer: docs pages (max-width plus a width toggle, sticky TOC).

---

## 4. Creative developer tools and interactive docs

### 4.1 Stripe Docs (Markdoc)

- URL: https://stripe.dev/blog/markdoc (redirected from stripe.com/blog/markdoc) · https://docs.stripe.com
- Evidence: CASE STUDY (fetched).
- Distinctive: the docs are "designed to feel like an application rather than a traditional user manual."
- Interaction: **personalized code samples with the reader's own test API key**; checklists, collapsible sections and tabs; content shown or hidden by country or by the features the user has; interactive diagrams.
- Techniques: Markdoc extends Markdown with custom tags and deliberately leaves out loops and variable assignment so content stays declarative; AST cached as JSON; a validator runs in CI.
- Stack (SEEN): Markdoc, markdown-it, peg.js, Node.js, React, React Flow (diagrams), Webpack, Web Components; legacy Ruby/ERB/Sinatra.
- Transferable: keep content declarative and code separate; validate docs in CI; personalize code samples.
- Do not copy: building a custom docs platform before content volume calls for one.
- SaaS/docs transfer: direct. Docs are part of the product UI.

### 4.2 Tailwind CSS docs

- URL: https://tailwindcss.com/docs/installation
- Evidence: FETCHED.
- IA: version selector (v4.3); ⌘K / Ctrl K search; a sidebar grouped by topic, where most reference pages cover one CSS property, so the sidebar works as an index of utilities; breadcrumbs; install paths (Vite / PostCSS / CLI / Framework guides / Play CDN).
- Techniques: **numbered steps (01–06)**, each with a heading, one sentence and a code block labeled with its file name (`vite.config.ts`, CSS, HTML, Terminal).
- Stack: Next.js and Algolia DocSearch are both UNKNOWN. Neither marker appeared in the extracted text.
- Transferable: label every code block with its file; one page per concept with a predictable layout; version shown in the chrome.
- SaaS/docs transfer: direct.

### 4.3 Motion docs (motion.dev) and Theatre.js

- URLs: https://motion.dev/docs · https://www.theatrejs.com/docs/latest
- Evidence: FETCHED (both). The Theatre.js studio-manual URL I tried returned 404, so its UI details are partly MEMORY-ONLY.
- Motion docs IA: separate tracks for React, JavaScript, Vue, Svelte, Three.js and "vgpu". The React and JS pages cover the same topics in parallel (scroll, layout, springs, easing, etc.). Adjacent products include "Motion Studio" (a visual timeline for editing animations on your own site) and an "AI Kit" that gives agents Motion skills. That is a direct precedent for SNOWBROS. Stack fingerprints: schema.org JSON-LD, generated versioned OG images. Framework UNKNOWN.
- Theatre.js: positioned as a tool that blurs designer and developer roles. Concepts: project → sheet → sheet object → sequence. It has guides for React Three Fiber, THREE.js and HTML/SVG, and an `@theatre/r3f` extension (SEEN in navigation). The keyframe sequence editor UI is MEMORY-ONLY.
- Transferable: parallel per-framework docs; a visual timeline editor that writes to code.
- Do not copy: inconsistent URL slugs (Motion's React pages mix prefixes).
- SaaS/docs transfer: framework switchers and parallel API pages.

---

## 5. Product configurators and commerce

### 5.1 smart web configurator (Demodern)

- URL: https://www.demodern.de/en/projects/smart-web-configurator
- Evidence: CASE STUDY (fetched).
- Distinctive: configure, buy and finance a car entirely online, built for direct-to-consumer sales.
- Interaction: the car sits in an urban environment; **a virtual camera rig makes cinematic moves between hotspots and detail views instead of free orbit**, which makes differences between options easier to see; card-swipe and step-by-step navigation, validated in repeated usability tests.
- Techniques: lightmaps and decals to keep textures small; a middleware layer to the backend; modular architecture so visualizers can be reused across markets.
- Stack (SEEN): only "3D / WebGL" and "Web". A Demodern search snippet about a separate smart project mentions React and Redux (THIRD-PARTY, not confirmed for this project).
- Transferable: **camera moves encode the selection** (pick wheels → the camera frames the wheels), which is motion as causality; stepwise flow plus a persistent summary.
- Do not copy: cinematic moves that block input. Keep them interruptible.
- SaaS/docs transfer: multi-step setup wizards where each step scrolls or frames the part of the preview it affects.

### 5.2 PureDrive-RT (Three.js community configurator)

- URL: https://discourse.threejs.org/t/performance-focused-real-time-3d-car-configurator-in-three-js/87892
- Evidence: THIRD-PARTY (author's forum post, fetched). It gives no metrics.
- Techniques: HDR environment lighting combined with prebaked shadows; rendering quality that adapts to runtime performance; GSAP camera transitions; UI sounds synced through the Web Audio API.
- Stack (SEEN): vanilla JS ES modules (no framework), Three.js, GSAP, glTF pipeline; Blender, Softimage, 3ds Max.
- Transferable: **an adaptive-quality governor** (lower DPR, shadows or effects when frame time rises).
- Do not copy: performance claims with no numbers. Measure your own.
- SaaS/docs transfer: the same governor idea for heavy charts or maps (switch to canvas or downsample above N points).

### 5.3 Apple Store buy flow

- URL: https://www.apple.com/shop/buy-iphone
- Evidence: MEMORY-ONLY. The fetch returned only navigation and footnotes, not the configurator DOM.
- Remembered pattern (unverified): one decision per section (model → finish → storage → trade-in → payment), a sticky price summary, help links ("Which model is right for you?") that open overlays, and footnote markers linking price terms (the footnote markers ◊ ∆ § ± † were SEEN).
- Transferable: one question at a time, a running total always visible, help next to the decision.
- SaaS/docs transfer: pricing and plan pickers, onboarding.

---

## 6. Interactive storytelling and data viz

### 6.1 The Pudding

- URL: https://pudding.cool · Starter: https://github.com/the-pudding/svelte-starter
- Evidence: FETCHED (home page and starter README). The /process page returned 404.
- Distinctive: numbered visual essays (#226 "kevin bacon", Oct 2026). The home page offers filter tabs (All / Our Faves / Popular / Updating / Your Input / Video / Audio) and a skip-to-content link.
- Stack (SEEN in the starter): SvelteKit (static SSR), Svelte 5 with Runed, Bits UI, ArchieML (Google Docs/Sheets as CMS), LayerCake (charts), Style Dictionary, Lucide. Components include **Scrolly.svelte** and **MotionToggle.svelte** (a toggle for the user's motion preference); actions include `focusTrap`, `inView`, `canTab`. Whether the live site uses this starter is INFERRED.
- Transferable: **a user-facing motion toggle on top of the OS preference**; writers edit copy in Docs (ArchieML) separately from code; one scrollytelling component reused across stories.
- Do not copy: scroll-jacked charts with no static fallback.
- SaaS/docs transfer: a motion toggle in settings; Style Dictionary for tokens.

### 6.2 Reuters Graphics

- URL: https://www.reuters.com/graphics/ (fetch blocked) · https://github.com/reuters-graphics (fetched)
- Evidence: FETCHED (GitHub org page only).
- Stack (SEEN): `graphics-components` (Svelte), `bluprint_graphics-kit` ("SvelteKit rig for graphics and newsapps", TypeScript), `ai2svelte` (Illustrator → Svelte), `spectre` (a cross-browser UI-audit harness using Playwright), `graphics-atlas-client` (standardized country names and codes, plus maps).
- Distinctive: tooling for a newsroom working to tight deadlines. The component library and scaffolding make every graphic consistent.
- Transferable: **automated visual and cross-browser audits (Playwright) as a graphics QA gate**; a shared data dictionary (country codes); an export path from the designer's tool into components.
- SaaS/docs transfer: a Playwright screenshot audit is a strong SNOWBROS CI feature.

### 6.3 Our World in Data, Grapher

- URL: https://github.com/owid/owid-grapher · https://ourworldindata.org
- Evidence: FETCHED (README).
- Distinctive: one chart engine drives almost every chart on the site, and charts are embeddable. Configs and data live in MySQL, so updated data reaches every chart that uses it. "Explorer" builds more complex views on top. The site is static (built by "Baker").
- Stack (SEEN): TypeScript, React, MobX, MySQL, PM2.
- Chart/table/map tabs: MEMORY-ONLY. The README does not mention them.
- Transferable: **charts as configuration, not code**; a static site build fed by a dynamic data source; embeds as first-class output.
- SaaS/docs transfer: very high. Dashboard widgets should be declarative configs.

---

## 7. Accessible, fast, content-heavy production sites

### 7.1 GOV.UK (Service Manual and Design System)

- URLs: https://www.gov.uk/service-manual/technology/using-progressive-enhancement · https://design-system.service.gov.uk/get-started/production/
- Evidence: FETCHED (both).
- Rules (SEEN): "make your page work with HTML first"; avoid CSS-in-JS so styling survives when JS fails; "The JavaScript layer is not fault-tolerant"; use client-side frameworks only for parts that "cannot be built using HTML and CSS alone", and build each as an isolated component; **do not build SPAs**, because they break assistive-technology announcements, focus, back/forward and error recovery. The Design System uses BEM classes (no global styles), ships Nunjucks macros, and lets you include component JS selectively through npm.
- Transferable: progressive enhancement as the default; isolate JS failures per component.
- Do not copy: the visual austerity for brand sites. It is right for government and only a choice elsewhere.
- SaaS/docs transfer: docs and settings pages should work without JS; route changes need focus management.

### 7.2 BBC GEL

- URL: https://bbc.github.io/gel/ (bbc.co.uk/gel could not be fetched)
- Evidence: FETCHED (github.io mirror).
- Foundations (SEEN): Focus, Grids, Headings, Iconography, **Routing ("Single-page app route changes should follow page-load conventions")**, Typography ("legible before it can be readable"). Performance approach: feature detection (`'IntersectionObserver' in window`) instead of large polyfills; layout enhanced with Grid inside `@supports`; reference code in ES5.
- Motion: the GEL pages I fetched have no motion guidance.
- Transferable: SPA route changes must move focus and announce the new page; enhance with `@supports`.
- SaaS/docs transfer: direct (route-change focus handling, accessible data tables).

### 7.3 Wikipedia Vector 2022

- See 3.3. It is also the strongest measured example of content-heavy readability work.

---

## 8. Design systems and animation-authoring tools

### 8.1 Radix Primitives

- URL: https://www.radix-ui.com/primitives/docs/guides/animation
- Evidence: FETCHED.
- Techniques (SEEN): animate with CSS through `[data-state="open"|"closed"]`; "the Radix Primitives will suspend unmount while your animation plays out" (exit animations work with plain CSS keyframes); `forceMount` hands mount control to JS animation libraries (example: React Spring `useTransition` with `asChild`).
- Reduced motion: not addressed on this page.
- Transferable: **state exposed as data attributes is the contract between behavior and motion**; exit animations without extra JS.
- SaaS/docs transfer: direct. SNOWBROS motion presets should target `data-state`.

### 8.2 Material 3 (motion tokens and the Expressive spring scheme)

- URL: Compose token sources (fetched) https://github.com/androidx/androidx/tree/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens (`MotionTokens.kt`, `StandardMotionTokens.kt`, `ExpressiveMotionTokens.kt`). The m3.material.io pages render client-side and returned only titles.
- Evidence: FETCHED (source code). Exact values are listed in the motion section below.
- Distinctive: two spring schemes, **Standard** (damping 0.9) and **Expressive** (bouncier spatial springs). Springs are split into **spatial** (position, size; may bounce) and **effects** (color, opacity; damping 1.0, never bounces).
- Transferable: separate spatial and effects springs; a single switch between a calm scheme and an expressive one is the SaaS-vs-marketing dial.

### 8.3 Rive (state machines and data binding)

- URLs: https://rive.app/docs/editor/state-machine/state-machine · https://rive.app/docs/runtimes/data-binding
- Evidence: FETCHED (overview pages only; inputs and listeners were not covered).
- Concepts (SEEN): "State Machines are a visual way to connect animations together and define the logic that drives the transitions"; states are timeline animations (idle / hover / pressed); transitions connect them; layers exist. Data binding "lets your app read and update values in a Rive file at runtime" through **View Models**.
- Transferable: interactive motion authored as a state graph, with code passing values in through a typed view model and not driving frames directly.
- Do not copy: complex in-app illustrations that do not respect reduced motion.
- SaaS/docs transfer: animated empty states, onboarding illustrations and status icons bound to real data.

### 8.4 Apple HIG Motion and IBM Carbon Motion (principles sources)

- See the motion section. Both FETCHED.

---

## Synthesis: generalizable principles

1. **Motion encodes causality.** Every movement should answer "what caused this, and where did it go?" Supported by: smart configurator (camera frames the option just picked), Rauno (spatial consistency), Apple HIG ("supporting the experience without overshadowing it"), Carbon (expressive motion "conveys meaning").
2. **Frequency sets the motion budget.** The more often an action happens, the less motion it gets. Supported by: Rauno (novelty wears off), Apple HIG ("avoid adding motion to UI interactions that occur frequently"), Carbon (productive motion for tasks), NN/g (~100 ms for simple feedback).
3. **Interruptible over choreographed.** Users must never wait for an animation to finish. Supported by: Apple HIG ("Let people cancel motion… don't make people wait"), Rauno ("Truly fluid gestures are immediately responsive"), M3 springs, which retarget from the current velocity.
4. **One clock and scheduler per page.** A single ordered loop drives all animated systems. Supported by: Bruno Simon (numbered stages 0–999), Igloo (staged loading and compilation), PureDrive (an adaptive governor needs one place to measure frame time).
5. **State as the contract between logic and motion.** Expose state (`data-state`, view models, inputs), and let motion react to it. Supported by: Radix, Rive (state machines and View Models), OWID Grapher (charts as configuration).
6. **Spatial continuity across routes and steps.** Objects keep their identity and location through transitions, and focus follows them. Supported by: smart configurator (camera moves between hotspots), Rauno (launch from the source icon), BBC GEL (route changes follow page-load conventions), GOV.UK (SPA focus failures).
7. **Density with hierarchy.** Dense screens stay calm through alignment, a limited set of type sizes and neutral chrome. Supported by: Linear (inverted-L chrome, alignment pass, Inter / Inter Display), Vercel (production vs preview split), Wikipedia (limited width, sticky TOC).
8. **Themes from a few perceptual inputs.** Generate tokens from base, accent and contrast in a perceptual color space. Supported by: Linear (LCH, three inputs replacing 98 variables), Pudding starter (Style Dictionary), M3 (token families).
9. **Progressive enhancement and fault isolation.** HTML first; JS enhances; one failing component must not take down the page. Supported by: GOV.UK, BBC GEL (`@supports`, feature detection), Igloo (DOM fallbacks needed for WebGL UI).
10. **Make reduced motion a product feature, not just a media query.** Respect `prefers-reduced-motion` and offer an in-product toggle; parallax counts as non-essential motion. Supported by: WCAG 2.3.3 (AAA, techniques C39/SCR40, parallax example), Pudding MotionToggle, Apple HIG (motion never the only channel).
11. **Plan the performance budget before the visuals.** Compress assets in the build, stage GPU work, adapt quality at runtime. Supported by: Igloo, Bruno Simon (glTF-Transform / KTX2 script), PureDrive (adaptive quality), Demodern (lightmaps and decals), Vercel (request priority, preconnect).
12. **Content separate from code, validated in CI.** Supported by: Stripe Markdoc (declarative tags, no loops, CI validator), Pudding ArchieML, Reuters spectre (Playwright audits), OWID (charts as configuration).
13. **Docs are an application.** Personalized samples, file-labeled steps, parallel per-framework tracks, ⌘K. Supported by: Stripe Docs, Tailwind, Motion docs, Raycast (palette as the core interaction).
14. **Separate the showcase from the workspace.** Expressive experiments get their own route or subdomain; the workspace stays productive. Supported by: Lusion (labs subdomain), Carbon (productive vs expressive), M3 (Standard vs Expressive scheme).

---

## Functional vs expressive motion (cited values)

**Definitions.** IBM Carbon (https://carbondesignsystem.com/elements/motion/overview/, FETCHED):
- **Productive** motion is "efficient and responsive", subtle, and for task-focused moments: button states, dropdowns, data table rendering.
- **Expressive** motion is "lively and highly visible", for significant moments: opening a page, a primary action, system alerts.

Map this onto SNOWBROS as follows. Functional (productive) is the default for SaaS, dashboards and docs. Expressive is reserved for marketing heroes, onboarding milestones and success states.

### IBM Carbon (FETCHED)

| Duration token | Value  |     | Easing   | Productive                      | Expressive                      |
| -------------- | ------ | --- | -------- | ------------------------------- | ------------------------------- |
| fast-01        | 70 ms  |     | standard | cubic-bezier(0.2, 0, 0.38, 0.9) | cubic-bezier(0.4, 0.14, 0.3, 1) |
| fast-02        | 110 ms |     | entrance | cubic-bezier(0, 0, 0.38, 0.9)   | cubic-bezier(0, 0, 0.3, 1)      |
| moderate-01    | 150 ms |     | exit     | cubic-bezier(0.2, 0, 1, 0.9)    | cubic-bezier(0.4, 0.14, 1, 1)   |
| moderate-02    | 240 ms |     |          |                                 |                                 |
| slow-01        | 400 ms |     |          |                                 |                                 |
| slow-02        | 700 ms |     |          |                                 |                                 |

### Material 3: duration and easing (FETCHED from androidx `MotionTokens.kt`)

- Short 1–4: **50 / 100 / 150 / 200 ms**. Medium 1–4: **250 / 300 / 350 / 400 ms**. Long 1–4: **450 / 500 / 550 / 600 ms**. Extra-long 1–4: **700 / 800 / 900 / 1000 ms**.
- Emphasized **cubic-bezier(0.2, 0, 0, 1)**; emphasized decelerate **(0.05, 0.7, 0.1, 1)**; emphasized accelerate **(0.3, 0, 0.8, 0.15)**.
- Standard **(0.2, 0, 0, 1)**; standard decelerate **(0, 0, 0, 1)**; standard accelerate **(0.3, 0, 1, 1)**.
- Legacy **(0.4, 0, 0.2, 1)**; legacy decelerate **(0, 0, 0.2, 1)**; legacy accelerate **(0.4, 0, 1, 1)**.

### Material 3: spring motion schemes (FETCHED from androidx `StandardMotionTokens.kt` / `ExpressiveMotionTokens.kt`)

| Spring                                                                                           | Standard (damping / stiffness) | Expressive (damping / stiffness) |
| ------------------------------------------------------------------------------------------------ | ------------------------------ | -------------------------------- |
| Fast spatial                                                                                     | 0.9 / 1400                     | 0.6 / 800                        |
| Default spatial                                                                                  | 0.9 / 700                      | 0.8 / 380                        |
| Slow spatial                                                                                     | 0.9 / 300                      | 0.8 / 200                        |
| Fast effects                                                                                     | 1.0 / 3800                     | 1.0 / 3800                       |
| Default effects                                                                                  | 1.0 / 1600                     | 1.0 / 1600                       |
| Slow effects                                                                                     | 1.0 / 800                      | 1.0 / 800                        |
| Effects springs (opacity, color) never bounce in either scheme. Only the spatial springs differ. |

### Microsoft Fluent 2 (FETCHED from `microsoft/fluentui` `packages/tokens/src/global`)

- Durations: ultraFast **50**, faster **100**, fast **150**, normal **200**, gentle **250**, slow **300**, slower **400**, ultraSlow **500** ms.
- Curves: decelerateMax (0.1, 0.9, 0.2, 1); decelerateMid (0, 0, 0, 1); decelerateMin (0.33, 0, 0.1, 1); accelerateMax (0.9, 0.1, 1, 0.2); accelerateMid (1, 0, 1, 1); accelerateMin (0.8, 0, 0.78, 1); easyEase (0.33, 0, 0.67, 1); easyEaseMax (0.8, 0, 0.2, 1); linear.
- The principles page (fluent2.microsoft.design/motion) is qualitative: larger elements get more time; linear easing only for constant-rate motion such as rotation.

### Apple HIG, Motion (FETCHED from the HIG JSON)

- No millisecond values. Rules quoted: "Add motion purposefully, supporting the experience without overshadowing it." "Aim for brevity and precision in feedback animations." "In apps, generally avoid adding motion to UI interactions that occur frequently." "Let people cancel motion." Do not use motion "as the only way to communicate important information." visionOS: avoid oscillation around **0.2 Hz**. Games: **30–60 fps** consistent frame rate.

### NN/g, Animation duration (FETCHED, https://www.nngroup.com/articles/animation-duration/)

- Most UI animations **100–500 ms**; simple feedback **~100 ms**; large screen changes such as a modal **200–300 ms**; **400 ms** is "very slow"; **500 ms or more** "feels like a drag". Entrances slightly longer than exits (for example 300 ms in, 200–250 ms out).

### WCAG 2.2 SC 2.3.3, Animation from Interactions (Level AAA, FETCHED)

- "Motion animation triggered by interaction can be disabled, unless the animation is essential…" Techniques: C39 (CSS `prefers-reduced-motion`), SCR40 (JS). Parallax is named as non-essential motion that can trigger vestibular reactions.

### Recommended SNOWBROS ranges (derived from the values above)

| Context                                                  | Duration                                                          | Easing / spring                                                                              |
| -------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Functional: hover, press, toggle, focus                  | 50–150 ms (M3 short1–3, Carbon fast-01/02, Fluent ultraFast–fast) | Carbon productive standard, or M3 standard (0.2, 0, 0, 1); effects springs (damping 1.0)     |
| Functional: dropdown, popover, tooltip, table row        | 150–250 ms (Carbon moderate-01/02, M3 short3–medium1)             | entrance (0, 0, 0.38, 0.9) in / exit (0.2, 0, 1, 0.9) out; exits about 20–30% shorter (NN/g) |
| Functional: modal, drawer, route change                  | 200–400 ms (NN/g 200–300; M3 medium)                              | M3 emphasized decelerate in / emphasized accelerate out; Standard spatial spring 0.9 / 700   |
| Expressive: hero reveal, onboarding milestone, success   | 400–700 ms (Carbon slow-01/02, M3 long–extraLong1)                | Carbon expressive (0.4, 0.14, 0.3, 1); M3 Expressive spatial spring 0.8 / 380                |
| Expressive: cinematic and scroll-linked (marketing only) | tied to scroll, or ≤1000 ms (M3 extraLong4)                       | always interruptible; disabled or replaced by a crossfade under reduced motion               |
