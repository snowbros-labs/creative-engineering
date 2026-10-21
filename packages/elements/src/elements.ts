import { createScope, type ProgressSource, type Scope } from '@snowbros/core';
import { magnetic, marquee, spotlight, tilt } from '@snowbros/fx';
import {
  pin,
  type RevealPreset,
  reveal,
  revealPresets,
  revealText,
  scrollProgress,
} from '@snowbros/motion';

/**
 * Light-DOM custom elements. No shadow DOM: your CSS, fonts and server-rendered content apply
 * unchanged, and everything works in plain HTML, Vue, Svelte, Astro, Rails, Django or PHP.
 *
 * Scroll-driven elements publish their progress as the CSS custom property `--sb-progress`
 * (0..1) on themselves and as `sb-progress` events, so styling can stay in CSS:
 *
 * ```css
 * sb-pin .bar { transform: scaleX(var(--sb-progress)); }
 * ```
 */
const Base: typeof HTMLElement =
  typeof HTMLElement !== 'undefined' ? HTMLElement : (class {} as unknown as typeof HTMLElement);

abstract class SnowbrosElement extends Base {
  protected scope: Scope | null = null;

  connectedCallback(): void {
    if (!this.style.display) this.style.display = 'block';
    this.scope?.dispose();
    this.scope = createScope();
    // Defer one microtask so children parsed after the opening tag exist.
    queueMicrotask(() => {
      if (this.scope && this.isConnected) this.setup(this.scope);
    });
  }

  disconnectedCallback(): void {
    this.scope?.dispose();
    this.scope = null;
  }

  attributeChangedCallback(): void {
    if (this.isConnected && this.scope) this.connectedCallback();
  }

  protected abstract setup(scope: Scope): void;

  protected num(name: string, fallback: number): number {
    const v = this.getAttribute(name);
    const n = v === null ? Number.NaN : Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  protected publish(source: ProgressSource, scope: Scope): void {
    const write = (p: number) => {
      this.style.setProperty('--sb-progress', p.toFixed(4));
      this.dispatchEvent(new CustomEvent('sb-progress', { detail: p }));
    };
    write(source.get());
    scope.add(source.subscribe(write));
  }
}

const preset = (v: string | null): RevealPreset | undefined =>
  v && v in revealPresets ? (v as RevealPreset) : undefined;

/** `<sb-reveal preset="fade-up" stagger="0.06" children>` — reveal on enter. */
export class SbReveal extends SnowbrosElement {
  static observedAttributes = ['preset', 'stagger', 'duration', 'delay', 'children'];
  protected setup(scope: Scope): void {
    const targets = this.hasAttribute('children') ? Array.from(this.children) : this;
    scope.add(
      reveal(targets, {
        preset: preset(this.getAttribute('preset')),
        stagger: this.num('stagger', 0.06),
        duration: this.num('duration', 0.7),
        delay: this.num('delay', 0),
      }),
    );
  }
}

/** `<sb-reveal-text by="lines" preset="rise"><h1>…</h1></sb-reveal-text>` */
export class SbRevealText extends SnowbrosElement {
  static observedAttributes = ['by', 'preset', 'stagger', 'delay', 'trigger'];
  protected setup(scope: Scope): void {
    const target = (this.firstElementChild as HTMLElement | null) ?? this;
    const by = this.getAttribute('by');
    const trigger = this.getAttribute('trigger');
    scope.add(
      revealText(target, {
        by: by === 'words' || by === 'chars' ? by : 'lines',
        preset: preset(this.getAttribute('preset')),
        delay: this.num('delay', 0),
        trigger: trigger === 'load' || trigger === 'manual' ? trigger : 'inview',
        ...(this.hasAttribute('stagger') ? { stagger: this.num('stagger', 0.08) } : {}),
      }),
    );
  }
}

/** `<sb-pin distance="200vh"><div>stage</div></sb-pin>` — sticky pin, publishes `--sb-progress`. */
export class SbPin extends SnowbrosElement {
  static observedAttributes = ['distance', 'top'];
  protected setup(scope: Scope): void {
    const p = pin(this, {
      distance: this.getAttribute('distance') ?? '100vh',
      top: this.getAttribute('top') ?? 0,
    });
    scope.add(p);
    this.publish(p.progress, scope);
  }
}

/** `<sb-scroll start="top bottom" end="bottom top">` — publishes `--sb-progress` while in view. */
export class SbScroll extends SnowbrosElement {
  static observedAttributes = ['start', 'end'];
  protected setup(scope: Scope): void {
    const p = scrollProgress(this, {
      start: this.getAttribute('start') ?? undefined,
      end: this.getAttribute('end') ?? undefined,
    });
    scope.add(p);
    this.publish(p, scope);
  }
}

/** `<sb-magnetic strength="0.3"><a class="btn">…</a></sb-magnetic>` — attracts its first child. */
export class SbMagnetic extends SnowbrosElement {
  static observedAttributes = ['strength', 'radius'];
  protected setup(scope: Scope): void {
    if (!this.style.display || this.style.display === 'block') this.style.display = 'inline-block';
    const target = (this.firstElementChild as HTMLElement | null) ?? this;
    scope.add(
      magnetic(target, { strength: this.num('strength', 0.35), radius: this.num('radius', 60) }),
    );
  }
}

/** `<sb-tilt max="8" glare>` — 3D pointer tilt on itself. */
export class SbTilt extends SnowbrosElement {
  static observedAttributes = ['max', 'glare'];
  protected setup(scope: Scope): void {
    scope.add(tilt(this, { max: this.num('max', 8), glare: this.hasAttribute('glare') }));
  }
}

/** `<sb-marquee speed="40" direction="left" pause-on-hover>` — clones children accessibly. */
export class SbMarquee extends SnowbrosElement {
  static observedAttributes = ['speed', 'direction', 'pause-on-hover'];
  protected setup(scope: Scope): void {
    const dir = this.getAttribute('direction');
    scope.add(
      marquee(this, {
        speed: this.num('speed', 40),
        direction: dir === 'right' ? 'right' : 'left',
        pauseOnHover: this.hasAttribute('pause-on-hover'),
      }),
    );
  }
}

/** `<sb-spotlight radius="240">` — sets `--sb-x`/`--sb-y` for CSS radial highlights. */
export class SbSpotlight extends SnowbrosElement {
  static observedAttributes = ['radius'];
  protected setup(scope: Scope): void {
    scope.add(spotlight(this, { radius: this.num('radius', 240) }));
  }
}

export const elements = {
  'sb-reveal': SbReveal,
  'sb-reveal-text': SbRevealText,
  'sb-pin': SbPin,
  'sb-scroll': SbScroll,
  'sb-magnetic': SbMagnetic,
  'sb-tilt': SbTilt,
  'sb-marquee': SbMarquee,
  'sb-spotlight': SbSpotlight,
} as const;

/** Register all elements (idempotent). Prefer importing `@snowbros/elements/define`. */
export function defineElements(registry: CustomElementRegistry = customElements): void {
  for (const [name, ctor] of Object.entries(elements)) {
    if (!registry.get(name)) registry.define(name, ctor);
  }
}
