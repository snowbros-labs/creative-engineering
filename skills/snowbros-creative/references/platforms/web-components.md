# Platform: Web Components (Lit, vanilla custom elements, interop layer)

**Detection:** `lit`, `customElements.define` in source, or a multi-framework design system.

**Use when:** one implementation must serve several frameworks or server-rendered pages; a design
system ships framework-agnostic components.

| SNOWBROS concept  | Custom element primitive                                                                                         |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| cleanup / scope   | create in `connectedCallback`, dispose in `disconnectedCallback` (elements can be moved: reconnect must re-init) |
| configuration     | attributes (`observedAttributes` + `attributeChangedCallback`) for strings/numbers; properties for objects       |
| state for styling | reflect `data-state` / custom states (`:state()` via `ElementInternals.states`, check support)                   |
| reduced motion    | `motionPreference.subscribe` inside the element                                                                  |

`@snowbros/elements` provides ready custom elements wrapping motion/fx patterns (see its README for
tag names and attributes; registration happens in its `define` entry).

**Rules**
- Light DOM for content that must be indexed/selectable (text reveals); Shadow DOM for encapsulated widgets.
- Never require JS for content visibility: element upgrades enhance already-rendered markup.
- Frameworks: Vue needs `isCustomElement`; React 19 supports custom element properties/events natively; Svelte works out of the box; Angular needs `CUSTOM_ELEMENTS_SCHEMA`.
- SSR: Declarative Shadow DOM if shadow content must render server-side; otherwise light DOM.

**Unsupported:** framework-specific presence animations (exit animations of elements the framework removes) — handle in the host framework.
