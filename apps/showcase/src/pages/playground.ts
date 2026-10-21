import '../styles/base.css';
import '../styles/playground.css';

import {
  createScope,
  createSignal,
  createSpringValue,
  type EaseFn,
  type EaseName,
  eases,
  motionPreference,
  type PatternHandle,
  Priority,
  prefersReducedMotion,
  resolveEase,
  type Scope,
  springEase,
  ticker,
  toCssLinear,
} from '@snowbros/core';
import { drawPath, finePointer, flowField, magnetic, scramble, tilt } from '@snowbros/fx';
import {
  animate,
  type RevealPreset,
  revealText,
  scrollProgress,
  scrub,
  stagger,
  timeline,
} from '@snowbros/motion';
import type { QualityLevel } from '@snowbros/scene';
import { withFallback } from '@snowbros/scene';
import { brandMark, initShell } from '../shell.js';

// ---------------------------------------------------------------- types

type Values = Record<string, string | number | boolean>;

type Control =
  | {
      key: string;
      label: string;
      type: 'range';
      min: number;
      max: number;
      step: number;
      value: number;
      unit?: string;
      /** Handled live by `update()` instead of a rebuild. */
      live?: boolean;
      when?: (v: Values) => boolean;
    }
  | {
      key: string;
      label: string;
      type: 'select';
      options: Array<[string, string]>;
      value: string;
      when?: (v: Values) => boolean;
      live?: boolean;
    }
  | {
      key: string;
      label: string;
      type: 'checkbox';
      value: boolean;
      when?: (v: Values) => boolean;
      live?: boolean;
    }
  | {
      key: string;
      label: string;
      type: 'text';
      value: string;
      when?: (v: Values) => boolean;
      live?: boolean;
    }
  | {
      key: string;
      label: string;
      type: 'color';
      value: string;
      when?: (v: Values) => boolean;
      live?: boolean;
    };

interface Mounted extends PatternHandle {
  /** Apply a `live` control change without rebuilding. */
  update?(values: Values, key: string): void;
  /** Replay button. Default: rebuild. */
  replay?(): void;
}

interface Pattern {
  id: string;
  title: string;
  summary: string;
  /** Shown in the stage banner when reduced motion is active. */
  reduced: string;
  controls: Control[];
  mount(body: HTMLElement, values: Values, scope: Scope): Mounted | undefined;
  code(values: Values): string;
}

const n = (v: Values, k: string) => Number(v[k]);
const s = (v: Values, k: string) => String(v[k]);
const b = (v: Values, k: string) => v[k] === true;
const fmt = (x: number, d = 2) => (Number.isInteger(x) ? String(x) : x.toFixed(d));

const html = (markup: string): HTMLElement => {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content.firstElementChild as HTMLElement;
};

/** A tiny ProgressSource for driving seekables from a slider. */
function sliderSource(initial: number) {
  const sig = createSignal(initial);
  return {
    get: sig.get,
    subscribe: (l: (p: number) => void) => sig.subscribe((v) => l(v)),
    set: sig.set,
  };
}

// ---------------------------------------------------------------- patterns

const EASE_NAMES = Object.keys(eases) as EaseName[];

const easing: Pattern = {
  id: 'easing',
  title: 'Easing lab',
  summary: 'Named curves, CSS cubic-bezier and analytic springs — plotted, played and exported.',
  reduced: 'The ball jumps to its end position. Curves are still plotted so you can compare them.',
  controls: [
    {
      key: 'mode',
      label: 'Source',
      type: 'select',
      value: 'named',
      options: [
        ['named', 'Named preset'],
        ['bezier', 'cubic-bezier()'],
        ['spring', 'Spring'],
      ],
    },
    {
      key: 'name',
      label: 'Preset',
      type: 'select',
      value: 'editorial',
      options: EASE_NAMES.map((k) => [k, k]),
      when: (v) => v.mode === 'named',
    },
    {
      key: 'x1',
      label: 'x1',
      type: 'range',
      min: 0,
      max: 1,
      step: 0.01,
      value: 0.2,
      when: (v) => v.mode === 'bezier',
    },
    {
      key: 'y1',
      label: 'y1',
      type: 'range',
      min: -0.5,
      max: 1.5,
      step: 0.01,
      value: 0,
      when: (v) => v.mode === 'bezier',
    },
    {
      key: 'x2',
      label: 'x2',
      type: 'range',
      min: 0,
      max: 1,
      step: 0.01,
      value: 0,
      when: (v) => v.mode === 'bezier',
    },
    {
      key: 'y2',
      label: 'y2',
      type: 'range',
      min: -0.5,
      max: 1.5,
      step: 0.01,
      value: 1,
      when: (v) => v.mode === 'bezier',
    },
    {
      key: 'stiffness',
      label: 'Stiffness',
      type: 'range',
      min: 20,
      max: 600,
      step: 5,
      value: 260,
      when: (v) => v.mode === 'spring',
    },
    {
      key: 'damping',
      label: 'Damping',
      type: 'range',
      min: 2,
      max: 60,
      step: 1,
      value: 14,
      when: (v) => v.mode === 'spring',
    },
    {
      key: 'mass',
      label: 'Mass',
      type: 'range',
      min: 0.2,
      max: 4,
      step: 0.1,
      value: 1,
      when: (v) => v.mode === 'spring',
    },
    {
      key: 'duration',
      label: 'Duration',
      type: 'range',
      min: 0.1,
      max: 3,
      step: 0.05,
      value: 1,
      unit: 's',
      when: (v) => v.mode !== 'spring',
    },
  ],
  mount(body, v, scope) {
    const { fn, duration, label } = easeFrom(v);
    // Sample the curve; let springs overshoot the frame.
    const pts: string[] = [];
    let min = 0;
    let max = 1;
    for (let i = 0; i <= 160; i++) {
      const y = fn(i / 160);
      min = Math.min(min, y);
      max = Math.max(max, y);
      pts.push(`${(i / 160) * 100},${(1 - y) * 100}`);
    }
    const pad = 8;
    const top = (1 - max) * 100 - pad;
    const height = (max - min) * 100 + pad * 2;
    const root = html(`
      <div class="pg-ease">
        <svg viewBox="-4 ${top} 108 ${height}" preserveAspectRatio="none" role="img" aria-label="Plot of ${label}: progress over time">
          <line class="axis" x1="0" y1="100" x2="100" y2="100"/>
          <line class="axis" x1="0" y1="0" x2="0" y2="100"/>
          <line class="guide" x1="0" y1="0" x2="100" y2="0"/>
          <polyline class="curve" points="${pts.join(' ')}"/>
          <circle class="head" r="1.6" cx="0" cy="100"/>
        </svg>
        <div>
          <div class="pg-track"><div class="pg-ball"></div></div>
          ${v.mode === 'spring' ? `<p class="pg-css-out" title="CSS linear() export">${toCssLinear(fn, 24)}</p>` : ''}
        </div>
        <div class="pg-readouts"><span>ease <b>${label}</b></span><span>duration <b>${fmt(duration)}s</b></span></div>
      </div>`);
    body.append(root);
    const ball = root.querySelector<HTMLElement>('.pg-ball')!;
    const track = root.querySelector<HTMLElement>('.pg-track')!;
    const head = root.querySelector<SVGCircleElement>('.head')!;
    const play = () => {
      const distance = track.clientWidth - ball.offsetWidth;
      const tl = animate(
        ball,
        { x: [0, distance] },
        {
          duration,
          ease: fn,
          onUpdate: (p) => {
            head.setAttribute('cx', String(p * 100));
            head.setAttribute('cy', String((1 - fn(p)) * 100));
          },
        },
      );
      scope.add(() => tl.kill());
    };
    play();
    return { dispose: () => scope.dispose(), replay: play };
  },
  code(v) {
    if (v.mode === 'spring') {
      return `import { springEase, toCssLinear } from '@snowbros/core';
import { animate } from '@snowbros/motion';

const { ease, duration } = springEase({ stiffness: ${n(v, 'stiffness')}, damping: ${n(v, 'damping')}, mass: ${n(v, 'mass')} });
animate('.ball', { x: [0, 320] }, { ease, duration });

// Same curve for CSS transitions / WAAPI:
el.style.transitionTimingFunction = toCssLinear(ease);`;
    }
    const ease =
      v.mode === 'bezier'
        ? `'cubic-bezier(${n(v, 'x1')}, ${n(v, 'y1')}, ${n(v, 'x2')}, ${n(v, 'y2')})'`
        : `'${s(v, 'name')}'`;
    return `import { animate } from '@snowbros/motion';

animate('.ball', { x: [0, 320] }, {
  duration: ${n(v, 'duration')},
  ease: ${ease},
});`;
  },
};

function easeFrom(v: Values): { fn: EaseFn; duration: number; label: string } {
  if (v.mode === 'spring') {
    const cfg = { stiffness: n(v, 'stiffness'), damping: n(v, 'damping'), mass: n(v, 'mass') };
    const { ease, duration } = springEase(cfg);
    return { fn: ease, duration, label: `spring(${cfg.stiffness}, ${cfg.damping}, ${cfg.mass})` };
  }
  if (v.mode === 'bezier') {
    const str = `cubic-bezier(${n(v, 'x1')}, ${n(v, 'y1')}, ${n(v, 'x2')}, ${n(v, 'y2')})` as const;
    return { fn: resolveEase(str), duration: n(v, 'duration'), label: str };
  }
  const name = s(v, 'name') as EaseName;
  return { fn: eases[name] ?? eases.outCubic, duration: n(v, 'duration'), label: name };
}

const PRESETS: RevealPreset[] = ['rise', 'fade-up', 'fade', 'blur', 'wipe', 'settle'];

const reveal: Pattern = {
  id: 'text-reveal',
  title: 'Text reveal',
  summary:
    'Accessible splitting by line, word or character. Screen readers get the sentence, not the fragments.',
  reduced: 'Spatial movement is dropped; units fade in over 0.2s.',
  controls: [
    { key: 'text', label: 'Headline', type: 'text', value: 'Motion with intent, built to last.' },
    {
      key: 'by',
      label: 'Split by',
      type: 'select',
      value: 'lines',
      options: [
        ['lines', 'Lines'],
        ['words', 'Words'],
        ['chars', 'Characters'],
      ],
    },
    {
      key: 'preset',
      label: 'Preset',
      type: 'select',
      value: 'rise',
      options: PRESETS.map((p) => [p, p]),
    },
    {
      key: 'stagger',
      label: 'Stagger',
      type: 'range',
      min: 0,
      max: 0.2,
      step: 0.005,
      value: 0.08,
      unit: 's',
    },
    {
      key: 'duration',
      label: 'Duration',
      type: 'range',
      min: 0.2,
      max: 2,
      step: 0.05,
      value: 0.9,
      unit: 's',
    },
  ],
  mount(body, v, scope) {
    const wrap = html(`<div class="pg-center"><h3 class="pg-reveal-text"></h3></div>`);
    const h = wrap.querySelector('h3')!;
    h.textContent = s(v, 'text') || ' ';
    body.append(wrap);
    const handle = revealText(h, {
      by: s(v, 'by') as 'lines' | 'words' | 'chars',
      preset: s(v, 'preset') as RevealPreset,
      stagger: n(v, 'stagger'),
      duration: n(v, 'duration'),
      trigger: 'manual',
    });
    scope.add(handle);
    void handle.play();
    return { dispose: () => scope.dispose() };
  },
  code(v) {
    return `import { revealText } from '@snowbros/motion';

const reveal = revealText(document.querySelector('h1')!, {
  by: '${s(v, 'by')}',
  preset: '${s(v, 'preset')}',
  stagger: ${n(v, 'stagger')},
  duration: ${n(v, 'duration')},
  trigger: 'inview', // or 'load' | 'manual'
});

// later: reveal.dispose() restores the original markup`;
  },
};

const COLS = 12;
const ROWS = 8;
let clickedOrigin = 40;

const staggerGrid: Pattern = {
  id: 'stagger',
  title: 'Stagger grid',
  summary: 'Delays distributed by 2D distance. Click a dot to move the origin.',
  reduced: 'The wave is skipped; dots appear in their final state.',
  controls: [
    {
      key: 'from',
      label: 'Origin',
      type: 'select',
      value: 'center',
      options: [
        ['start', 'Start'],
        ['center', 'Center'],
        ['end', 'End'],
        ['random', 'Random'],
        ['clicked', 'Clicked dot'],
      ],
    },
    {
      key: 'each',
      label: 'Each',
      type: 'range',
      min: 0.01,
      max: 0.2,
      step: 0.005,
      value: 0.06,
      unit: 's',
    },
    {
      key: 'duration',
      label: 'Duration',
      type: 'range',
      min: 0.2,
      max: 1.6,
      step: 0.05,
      value: 0.7,
      unit: 's',
    },
  ],
  mount(body, v, scope) {
    const grid = html(
      `<div class="pg-center"><div class="pg-grid" aria-hidden="true"></div></div>`,
    );
    const g = grid.querySelector<HTMLElement>('.pg-grid')!;
    const dots: HTMLElement[] = [];
    for (let i = 0; i < COLS * ROWS; i++) {
      const d = document.createElement('span');
      d.dataset.i = String(i);
      g.append(d);
      dots.push(d);
    }
    body.append(grid);
    const from = s(v, 'from');
    const origin: 'start' | 'center' | 'end' | 'random' | number =
      from === 'clicked' ? clickedOrigin : (from as 'start' | 'center' | 'end' | 'random');
    if (typeof origin === 'number') dots[origin]?.setAttribute('data-origin', '');
    let tl: ReturnType<typeof animate> | null = null;
    const play = () => {
      tl?.kill();
      tl = animate(
        dots,
        { scale: [0.2, 1], opacity: [0.15, 1] },
        {
          duration: n(v, 'duration'),
          ease: 'outExpo',
          stagger: stagger(n(v, 'each'), { from: origin, grid: [COLS, ROWS] }),
        },
      );
    };
    play();
    scope.listen(g, 'click', (e) => {
      const i = (e.target as HTMLElement).dataset.i;
      if (i === undefined) return;
      clickedOrigin = Number(i);
      setValue('from', 'clicked');
    });
    scope.add(() => tl?.kill());
    return { dispose: () => scope.dispose(), replay: play };
  },
  code(v) {
    const from = v.from === 'clicked' ? String(clickedOrigin) : `'${s(v, 'from')}'`;
    return `import { animate, stagger } from '@snowbros/motion';

animate('.dot', { scale: [0.2, 1], opacity: [0.15, 1] }, {
  duration: ${n(v, 'duration')},
  ease: 'outExpo',
  stagger: stagger(${n(v, 'each')}, { from: ${from}, grid: [${COLS}, ${ROWS}] }),
});`;
  },
};

const springFollower: Pattern = {
  id: 'spring',
  title: 'Spring follower',
  summary:
    'Retargetable springs keep their velocity. Move the pointer, or focus the stage and use arrow keys.',
  reduced: 'The dot jumps straight to the target — no lag, no overshoot.',
  controls: [
    {
      key: 'stiffness',
      label: 'Stiffness',
      type: 'range',
      min: 20,
      max: 800,
      step: 5,
      value: 170,
      live: true,
    },
    {
      key: 'damping',
      label: 'Damping',
      type: 'range',
      min: 2,
      max: 60,
      step: 1,
      value: 18,
      live: true,
    },
    {
      key: 'mass',
      label: 'Mass',
      type: 'range',
      min: 0.2,
      max: 4,
      step: 0.1,
      value: 1,
      live: true,
    },
  ],
  mount(body, v, scope) {
    const area = html(`
      <div class="pg-follow" tabindex="0" role="application" aria-label="Spring follower. Use arrow keys to move the target.">
        <div class="pg-follow-target"></div><div class="pg-follow-dot"></div>
        <div class="pg-readouts"><span>velocity <b data-vel>0</b> px/s</span><span>settled <b data-settled>yes</b></span></div>
      </div>`);
    body.append(area);
    const dot = area.querySelector<HTMLElement>('.pg-follow-dot')!;
    const target = area.querySelector<HTMLElement>('.pg-follow-target')!;
    const velOut = area.querySelector<HTMLElement>('[data-vel]')!;
    const settledOut = area.querySelector<HTMLElement>('[data-settled]')!;
    let cfg = { stiffness: n(v, 'stiffness'), damping: n(v, 'damping'), mass: n(v, 'mass') };
    let x = createSpringValue(0, cfg);
    let y = createSpringValue(0, cfg);
    let tx = area.clientWidth / 2;
    let ty = area.clientHeight / 2;
    x.jump(tx);
    y.jump(ty);
    let stop: (() => void) | null = null;
    let lastReadout = 0;
    const draw = () => {
      dot.style.transform = `translate3d(${x.value}px, ${y.value}px, 0)`;
      target.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
    };
    const loop = (f: { delta: number; time: number }) => {
      x.step(f.delta);
      y.step(f.delta);
      draw();
      if (f.time - lastReadout > 100) {
        lastReadout = f.time;
        velOut.textContent = String(Math.round(Math.hypot(x.velocity, y.velocity)));
        settledOut.textContent = x.settled && y.settled ? 'yes' : 'no';
      }
      if (x.settled && y.settled) {
        velOut.textContent = '0';
        settledOut.textContent = 'yes';
        stop?.();
        stop = null;
      }
    };
    const setTarget = (nx: number, ny: number) => {
      tx = Math.min(Math.max(nx, 0), area.clientWidth);
      ty = Math.min(Math.max(ny, 0), area.clientHeight);
      if (prefersReducedMotion()) {
        x.jump(tx);
        y.jump(ty);
        draw();
        return;
      }
      x.set(tx);
      y.set(ty);
      if (!stop) stop = ticker.add(loop, Priority.update);
    };
    draw();
    scope.listen(area, 'pointermove', (e) => {
      const r = area.getBoundingClientRect();
      setTarget(e.clientX - r.left, e.clientY - r.top);
    });
    scope.listen(area, 'keydown', (e) => {
      const step = e.shiftKey ? 96 : 32;
      const moves: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      const m = moves[e.key];
      if (!m) return;
      e.preventDefault();
      setTarget(tx + m[0], ty + m[1]);
    });
    scope.add(() => stop?.());
    return {
      dispose: () => scope.dispose(),
      update(values) {
        cfg = {
          stiffness: n(values, 'stiffness'),
          damping: n(values, 'damping'),
          mass: n(values, 'mass'),
        };
        const nx = createSpringValue(x.value, cfg);
        const ny = createSpringValue(y.value, cfg);
        nx.set(tx);
        ny.set(ty);
        x = nx;
        y = ny;
        if (!stop && !prefersReducedMotion()) stop = ticker.add(loop, Priority.update);
      },
      replay() {
        setTarget(Math.random() * area.clientWidth, Math.random() * area.clientHeight);
      },
    };
  },
  code(v) {
    return `import { createSpringValue, ticker } from '@snowbros/core';

const cfg = { stiffness: ${n(v, 'stiffness')}, damping: ${n(v, 'damping')}, mass: ${n(v, 'mass')} };
const x = createSpringValue(0, cfg);
const y = createSpringValue(0, cfg);

stage.addEventListener('pointermove', (e) => { x.set(e.offsetX); y.set(e.offsetY); });
const stop = ticker.add(({ delta }) => {
  dot.style.transform = \`translate3d(\${x.step(delta)}px, \${y.step(delta)}px, 0)\`;
});`;
  },
};

const magnets: Pattern = {
  id: 'magnetic',
  title: 'Magnetic & tilt',
  summary:
    'Pointer-attraction on springs and 3D tilt. Disabled automatically on touch-first devices.',
  reduced: 'Elements still respond, but without spring lag or overshoot.',
  controls: [
    {
      key: 'strength',
      label: 'Magnet strength',
      type: 'range',
      min: 0.05,
      max: 1,
      step: 0.05,
      value: 0.35,
    },
    {
      key: 'radius',
      label: 'Magnet radius',
      type: 'range',
      min: 0,
      max: 160,
      step: 5,
      value: 60,
      unit: 'px',
    },
    { key: 'max', label: 'Tilt max', type: 'range', min: 1, max: 25, step: 1, value: 8, unit: '°' },
    { key: 'glare', label: 'Tilt glare', type: 'checkbox', value: true },
    { key: 'force', label: 'Force on coarse pointers', type: 'checkbox', value: false },
  ],
  mount(body, v, scope) {
    const wrap = html(`
      <div class="pg-center">
        <div class="pg-magnets">
          <button type="button" class="pg-magnet"><span>Hover me</span></button>
          <button type="button" class="pg-magnet is-solid"><span>Start</span></button>
          <div class="pg-tilt-card"><span class="label">Card / 04</span><strong>Tilt</strong></div>
        </div>
        <div class="pg-readouts"><span>fine pointer <b>${finePointer() ? 'yes' : 'no — effects off unless forced'}</b></span></div>
      </div>`);
    body.append(wrap);
    const force = b(v, 'force');
    for (const m of wrap.querySelectorAll<HTMLElement>('.pg-magnet')) {
      scope.add(
        magnetic(m, {
          strength: n(v, 'strength'),
          radius: n(v, 'radius'),
          inner: m.querySelector('span') ?? undefined,
          force,
        }),
      );
    }
    scope.add(
      tilt(wrap.querySelector<HTMLElement>('.pg-tilt-card')!, {
        max: n(v, 'max'),
        glare: b(v, 'glare'),
        force,
      }),
    );
    return { dispose: () => scope.dispose() };
  },
  code(v) {
    return `import { magnetic, tilt } from '@snowbros/fx';

const m = magnetic(button, {
  strength: ${n(v, 'strength')},
  radius: ${n(v, 'radius')},
  inner: button.querySelector('span'),${b(v, 'force') ? '\n  force: true,' : ''}
});
const t = tilt(card, { max: ${n(v, 'max')}, glare: ${b(v, 'glare')} });

// teardown restores inline styles
m.dispose(); t.dispose();`;
  },
};

const CHARSETS: Record<string, string> = {
  latin: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/<>',
  binary: '01',
  blocks: '░▒▓█▀▄▌▐',
  lower: 'abcdefghijklmnopqrstuvwxyz',
};

const scrambleP: Pattern = {
  id: 'scramble',
  title: 'Scramble',
  summary: 'Decode text left to right. The real text is always in the accessibility tree.',
  reduced: 'The final text appears immediately.',
  controls: [
    { key: 'text', label: 'Text', type: 'text', value: 'COLD PRECISION / WARM SIGNAL' },
    {
      key: 'chars',
      label: 'Glyphs',
      type: 'select',
      value: 'latin',
      options: [
        ['latin', 'Latin + symbols'],
        ['binary', 'Binary'],
        ['blocks', 'Blocks'],
        ['lower', 'Lowercase'],
      ],
    },
    {
      key: 'duration',
      label: 'Duration',
      type: 'range',
      min: 0.2,
      max: 3,
      step: 0.05,
      value: 1.2,
      unit: 's',
    },
  ],
  mount(body, v, scope) {
    const wrap = html(`<div class="pg-center"><p class="pg-scramble"></p></div>`);
    const p = wrap.querySelector<HTMLElement>('p')!;
    p.textContent = s(v, 'text');
    body.append(wrap);
    const h = scramble(p, {
      text: s(v, 'text'),
      chars: CHARSETS[s(v, 'chars')],
      duration: n(v, 'duration'),
      trigger: 'manual',
    });
    scope.add(h);
    void h.play();
    return { dispose: () => scope.dispose(), replay: () => void h.play() };
  },
  code(v) {
    return `import { scramble } from '@snowbros/fx';

const s = scramble(el, {
  text: ${JSON.stringify(s(v, 'text'))},
  chars: ${JSON.stringify(CHARSETS[s(v, 'chars')])},
  duration: ${n(v, 'duration')},
  trigger: 'inview',
});`;
  },
};

const flow: Pattern = {
  id: 'flow-field',
  title: 'Flow field',
  summary:
    'Procedural canvas lines following seeded gradient noise. Pauses offscreen and in hidden tabs.',
  reduced: 'A single static frame is drawn instead of a moving field.',
  controls: [
    { key: 'density', label: 'Density', type: 'range', min: 0.2, max: 2, step: 0.05, value: 1 },
    { key: 'speed', label: 'Speed', type: 'range', min: 0.1, max: 3, step: 0.05, value: 1 },
    {
      key: 'lineWidth',
      label: 'Line width',
      type: 'range',
      min: 0.5,
      max: 4,
      step: 0.25,
      value: 1,
      unit: 'px',
    },
    {
      key: 'fade',
      label: 'Trail fade',
      type: 'range',
      min: 0.01,
      max: 0.3,
      step: 0.01,
      value: 0.06,
    },
    { key: 'color', label: 'Color', type: 'color', value: '#0b0c0e' },
    { key: 'seed', label: 'Seed', type: 'range', min: 1, max: 999, step: 1, value: 7 },
  ],
  mount(body, v, scope) {
    const canvas = document.createElement('canvas');
    canvas.className = 'pg-canvas';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Decorative flow field of lines following noise');
    body.append(canvas);
    const h = flowField(canvas, {
      density: n(v, 'density'),
      speed: n(v, 'speed'),
      lineWidth: n(v, 'lineWidth'),
      fade: n(v, 'fade'),
      color: s(v, 'color'),
      seed: n(v, 'seed'),
    });
    scope.add(h);
    return { dispose: () => scope.dispose() };
  },
  code(v) {
    return `import { flowField } from '@snowbros/fx';

const field = flowField(canvas, {
  density: ${n(v, 'density')},
  speed: ${n(v, 'speed')},
  lineWidth: ${n(v, 'lineWidth')},
  fade: ${n(v, 'fade')},
  color: '${s(v, 'color')}',
  seed: ${n(v, 'seed')},
});
// field.pause() / field.play() / field.dispose()`;
  },
};

/** Original line drawing: a ridge line, a snow crystal and a horizon. */
const DRAWING = `
<svg viewBox="0 0 560 300" role="img" aria-label="Line drawing of a mountain ridge under a snow crystal">
  <polyline points="10,260 92,170 128,196 196,96 236,140 268,112 352,214 396,180 470,250 550,260"/>
  <polyline points="196,96 214,128 200,150 226,170"/>
  <polyline points="268,112 280,140 300,148"/>
  <line x1="10" y1="276" x2="550" y2="276"/>
  <g class="accent">
    <line x1="430" y1="40" x2="430" y2="120"/>
    <line x1="395.4" y1="60" x2="464.6" y2="100"/>
    <line x1="395.4" y1="100" x2="464.6" y2="60"/>
    <polyline points="420,48 430,56 440,48"/>
    <polyline points="420,112 430,104 440,112"/>
  </g>
</svg>`;

const draw: Pattern = {
  id: 'path-draw',
  title: 'Path drawing',
  summary: 'Stroke drawing from any progress source — a slider here, scroll on a page.',
  reduced: '“Play” jumps to the drawn state. The slider still works: it is your own input.',
  controls: [
    {
      key: 'progress',
      label: 'Progress',
      type: 'range',
      min: 0,
      max: 1,
      step: 0.001,
      value: 0.6,
      live: true,
    },
    {
      key: 'duration',
      label: 'Play duration',
      type: 'range',
      min: 0.3,
      max: 4,
      step: 0.1,
      value: 1.6,
      unit: 's',
    },
  ],
  mount(body, v, scope) {
    const wrap = html(`<div class="pg-center pg-draw">${DRAWING}</div>`);
    body.append(wrap);
    const source = sliderSource(n(v, 'progress'));
    const paths = wrap.querySelectorAll<SVGGeometryElement>('polyline, line');
    const h = drawPath(paths, source);
    scope.add(h);
    return {
      dispose: () => scope.dispose(),
      update(values) {
        source.set(n(values, 'progress'));
      },
      replay() {
        void h.play({ duration: n(v, 'duration'), ease: 'inOutCubic' }).then(() => {
          if (!scope.disposed) setValue('progress', 1, false);
        });
      },
    };
  },
  code(v) {
    return `import { drawPath } from '@snowbros/fx';
import { scrollProgress } from '@snowbros/motion';

// Drive by scroll…
const draw = drawPath('svg path', scrollProgress(section));
// …or seek / play it yourself
draw.seek(${n(v, 'progress')});
await draw.play({ duration: ${n(v, 'duration')}, ease: 'inOutCubic' });`;
  },
};

const CRYSTAL_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="0.6" stroke-linecap="round"><path d="M12 2v20M3.34 7l17.32 10M3.34 17 20.66 7"/><path d="m9.5 3.8 2.5 2 2.5-2M9.5 20.2l2.5-2 2.5 2M4 10.2l3 .8-1 3M20 13.8l-3-.8 1-3M4 13.8l3-.8-1-3M20 10.2l-3 .8 1 3"/></svg>`;

let lastDisposal = '';

const three: Pattern = {
  id: '3d',
  title: '3D stage',
  summary:
    'Managed Three.js stage: studio lighting without HDR, particle snow, drag with inertia, full GPU cleanup.',
  reduced: 'The static fallback is shown instead of WebGL (respect-reduced-motion is on).',
  controls: [
    { key: 'count', label: 'Particles', type: 'range', min: 0, max: 4000, step: 100, value: 1200 },
    { key: 'autoSpin', label: 'Idle auto-spin', type: 'checkbox', value: true },
    {
      key: 'quality',
      label: 'Quality (pixel ratio cap)',
      type: 'select',
      value: 'high',
      options: [
        ['low', 'Low — 1×'],
        ['mid', 'Mid — 1.5×'],
        ['high', 'High — 2×'],
      ],
    },
    { key: 'respect', label: 'Fallback under reduced motion', type: 'checkbox', value: true },
  ],
  mount(body, v, scope) {
    const host = html(`<div class="pg-three"></div>`);
    body.append(host);
    const fb = withFallback(host, {
      respectReducedMotion: b(v, 'respect'),
      rootMargin: '0px',
      fallback(el) {
        const reason = el.dataset.reason ?? 'unsupported';
        el.append(
          html(
            `<div class="pg-fallback">${CRYSTAL_SVG}<p class="muted">Static fallback (${reason}). The same content, without WebGL — this is what low-power devices and reduced-motion users get.</p></div>`,
          ),
        );
      },
      onDecision(mode, reason) {
        host.dataset.reason = reason;
        if (mode === 'fallback') host.dataset.reason = reason;
      },
      async render(el, rscope) {
        // three.js loads only now — keeps it out of the playground's initial bundle.
        const { renderCrystal } = await import('./playground-three.js');
        await renderCrystal(el, rscope, {
          quality: s(v, 'quality') as QualityLevel,
          count: n(v, 'count'),
          autoSpin: b(v, 'autoSpin'),
          onDisposed: (summary) => {
            lastDisposal = summary;
          },
        });
      },
    });
    scope.add(fb);
    return { dispose: () => scope.dispose() };
  },
  code(v) {
    return `import { createOrbitInertia, createParticleField, createStage,
  createStudioEnvironment, withFallback } from '@snowbros/scene';

withFallback(container, {
  respectReducedMotion: ${b(v, 'respect')},
  fallback: (el) => el.append(staticImage),
  async render(el, scope) {
    const stage = createStage({ container: el, quality: '${s(v, 'quality')}' });
    scope.add(stage);
    const env = await createStudioEnvironment(stage.renderer);
    stage.track(env);
    stage.scene.environment = env.texture;
    stage.add(crystal);${n(v, 'count') > 0 ? `\n    const snow = stage.add(createParticleField({ count: ${n(v, 'count')} }));\n    stage.onFrame(({ delta }) => snow.tick(delta));` : ''}
    scope.add(createOrbitInertia(crystal, stage.canvas, { autoSpin: ${b(v, 'autoSpin') ? 0.25 : 0} }));
  },
});`;
  },
};

const scrubP: Pattern = {
  id: 'scroll-scrub',
  title: 'Scroll scrub',
  summary: 'Scroll the left panel. One listener per container, cached layout, optional damping.',
  reduced: 'Scrubbing still follows your scroll (it is your own input); smoothing is unaffected.',
  controls: [
    {
      key: 'smooth',
      label: 'Smoothing (rate/s, 0 = off)',
      type: 'range',
      min: 0,
      max: 24,
      step: 1,
      value: 8,
    },
    {
      key: 'rotate',
      label: 'Rotation',
      type: 'range',
      min: 0,
      max: 720,
      step: 15,
      value: 180,
      unit: '°',
    },
  ],
  mount(body, v, scope) {
    const wrap = html(`
      <div class="pg-scrub">
        <div class="pg-scroller" tabindex="0" role="region" aria-label="Scrollable area driving the animation">
          <div class="pg-scroller-track"><p>↓ scroll · 0%</p><p>25%</p><p>50%</p><p>75%</p><p>100% · end</p></div>
        </div>
        <div class="pg-scrub-visual" aria-hidden="true">
          <div class="pg-scrub-shape"></div>
          <div class="pg-scrub-num">0.00</div>
          <div class="pg-scrub-bar"><i></i></div>
        </div>
      </div>`);
    body.append(wrap);
    const scroller = wrap.querySelector<HTMLElement>('.pg-scroller')!;
    const track = wrap.querySelector<HTMLElement>('.pg-scroller-track')!;
    const num = wrap.querySelector<HTMLElement>('.pg-scrub-num')!;
    const shape = wrap.querySelector<HTMLElement>('.pg-scrub-shape')!;
    const bar = wrap.querySelector<HTMLElement>('.pg-scrub-bar i')!;
    const p = scrollProgress(track, {
      container: scroller,
      start: 'top top',
      end: 'bottom bottom',
    });
    scope.add(p);
    const tl = timeline()
      .to(
        shape,
        { rotate: [0, n(v, 'rotate')], scale: [0.6, 1.1] },
        { duration: 1, ease: 'linear' },
      )
      .to(bar, { scaleX: [0, 1] }, { duration: 1, ease: 'linear' }, 0)
      .to(shape, { borderRadius: ['0%', '50%'] }, { duration: 0.5, ease: 'inOutCubic' }, 0.5);
    scope.add(() => tl.kill());
    const smooth = n(v, 'smooth');
    scope.add(scrub(tl, p, { smooth: smooth > 0 ? smooth : false }));
    const write = (x: number) => {
      num.textContent = x.toFixed(2);
    };
    write(p.get());
    scope.add(p.subscribe(write));
    return {
      dispose: () => scope.dispose(),
      replay: () =>
        scroller.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' }),
    };
  },
  code(v) {
    const smooth = n(v, 'smooth');
    return `import { scrollProgress, scrub, timeline } from '@snowbros/motion';

const progress = scrollProgress(track, {
  container: scroller, // omit for window scrolling
  start: 'top top',
  end: 'bottom bottom',
});
const tl = timeline()
  .to(shape, { rotate: [0, ${n(v, 'rotate')}], scale: [0.6, 1.1] }, { duration: 1, ease: 'linear' })
  .to(bar, { scaleX: [0, 1] }, { duration: 1, ease: 'linear' }, 0);

scrub(tl, progress, { smooth: ${smooth > 0 ? smooth : 'false'} });`;
  },
};

const PATTERNS: Pattern[] = [
  easing,
  reveal,
  staggerGrid,
  springFollower,
  magnets,
  scrambleP,
  flow,
  draw,
  three,
  scrubP,
];

// ---------------------------------------------------------------- app state

const app = createScope();
initShell();
document.querySelector('[data-brand]')?.insertAdjacentHTML('afterbegin', brandMark);

const tabsEl = document.getElementById('pg-tabs')!;
const body = document.getElementById('pg-stage-body')!;
const controlList = document.getElementById('pg-control-list')!;
const codeEl = document.getElementById('pg-code')!;
const statusEl = document.getElementById('pg-status')!;
const copyNote = document.getElementById('pg-copy-note')!;
const banner = document.getElementById('pg-banner')!;
const bannerText = document.getElementById('pg-banner-text')!;
const lifecycle = document.getElementById('pg-lifecycle')!;

let active: Pattern = PATTERNS[0]!;
let values: Values = {};
let current: Mounted | undefined;
let currentScope: Scope | null = null;
let mounts = 0;
const valueStore = new Map<string, Values>();

function defaults(p: Pattern): Values {
  return Object.fromEntries(p.controls.map((c) => [c.key, c.value]));
}

function unmount() {
  if (!currentScope) return;
  current?.dispose();
  currentScope.dispose();
  current = undefined;
  currentScope = null;
  body.replaceChildren();
}

function mount() {
  unmount();
  currentScope = app.child();
  current = active.mount(body, values, currentScope);
  mounts++;
  lifecycle.textContent = `Lifecycle: mount #${mounts} · ${active.id}${lastDisposal ? ` · ${lastDisposal}` : ''}`;
  lastDisposal = '';
  codeEl.textContent = active.code(values);
}

let rebuildQueued = false;
function scheduleRebuild() {
  if (rebuildQueued) return;
  rebuildQueued = true;
  requestAnimationFrame(() => {
    rebuildQueued = false;
    mount();
  });
}

/** Programmatic value change (from pattern interactions). */
function setValue(key: string, value: string | number | boolean, rebuild = true) {
  values[key] = value;
  valueStore.set(active.id, values);
  renderControls();
  if (rebuild) scheduleRebuild();
  else codeEl.textContent = active.code(values);
}

// ---------------------------------------------------------------- controls

function renderControls() {
  controlList.replaceChildren();
  for (const c of active.controls) {
    if (c.when && !c.when(values)) continue;
    const id = `pg-c-${active.id}-${c.key}`;
    const v = values[c.key];
    let row: HTMLElement;
    if (c.type === 'checkbox') {
      row = html(
        `<div class="pg-control-check"><input type="checkbox" id="${id}"/><label for="${id}"></label></div>`,
      );
      row.querySelector('label')!.textContent = c.label;
      row.querySelector('input')!.checked = v === true;
    } else {
      row = html(
        `<div class="pg-control"><div class="pg-control-row"><label for="${id}"></label></div></div>`,
      );
      row.querySelector('label')!.textContent = c.label;
      const headRow = row.querySelector('.pg-control-row')!;
      let input: HTMLInputElement | HTMLSelectElement;
      if (c.type === 'select') {
        const sel = document.createElement('select');
        for (const [val, text] of c.options) {
          const o = document.createElement('option');
          o.value = val;
          o.textContent = text;
          sel.append(o);
        }
        sel.value = String(v);
        input = sel;
      } else {
        const inp = document.createElement('input');
        inp.type = c.type;
        if (c.type === 'range') {
          inp.min = String(c.min);
          inp.max = String(c.max);
          inp.step = String(c.step);
          const out = document.createElement('output');
          out.htmlFor.add(id);
          out.textContent = `${fmt(Number(v), 3)}${c.unit ?? ''}`;
          headRow.append(out);
        }
        inp.value = String(v);
        input = inp;
      }
      input.id = id;
      row.append(input);
    }
    row.dataset.key = c.key;
    controlList.append(row);
  }
}

function onControlInput(e: Event) {
  const input = e.target as HTMLInputElement | HTMLSelectElement;
  const row = input.closest<HTMLElement>('[data-key]');
  if (!row) return;
  const key = row.dataset.key!;
  const c = active.controls.find((x) => x.key === key);
  if (!c) return;
  const value: string | number | boolean =
    c.type === 'checkbox'
      ? (input as HTMLInputElement).checked
      : c.type === 'range'
        ? Number(input.value)
        : input.value;
  // Text inputs rebuild on `change` only, so typing isn't interrupted every keystroke.
  if (c.type === 'text' && e.type === 'input') return;
  values[key] = value;
  valueStore.set(active.id, values);
  if (c.type === 'range') {
    const out = row.querySelector('output');
    if (out) out.textContent = `${fmt(value as number, 3)}${c.unit ?? ''}`;
  }
  const affectsVisibility = active.controls.some((x) => x.when);
  if (affectsVisibility && c.type === 'select') {
    renderControls();
    document.getElementById(input.id)?.focus();
  }
  if (c.live && current?.update) {
    current.update(values, key);
    codeEl.textContent = active.code(values);
    return;
  }
  scheduleRebuild();
}

app.listen(controlList, 'input', onControlInput);
app.listen(controlList, 'change', (e) => {
  const t = e.target as HTMLInputElement;
  if (t.type === 'text' || t.tagName === 'SELECT' || t.type === 'checkbox' || t.type === 'color')
    onControlInput(e);
});

// ---------------------------------------------------------------- tabs

const tabs: HTMLButtonElement[] = PATTERNS.map((p, i) => {
  const t = document.createElement('button');
  t.type = 'button';
  t.className = 'pg-tab';
  t.id = `pg-tab-${p.id}`;
  t.setAttribute('role', 'tab');
  t.setAttribute('aria-controls', 'pg-stage');
  t.dataset.id = p.id;
  t.innerHTML = `<span class="pg-tab-num">${String(i + 1).padStart(2, '0')}</span><span></span>`;
  t.lastElementChild!.textContent = p.title;
  tabsEl.append(t);
  return t;
});

function select(id: string, { focus = false, updateHash = true } = {}) {
  const idx = Math.max(
    0,
    PATTERNS.findIndex((p) => p.id === id),
  );
  active = PATTERNS[idx]!;
  values = { ...defaults(active), ...valueStore.get(active.id) };
  tabs.forEach((t, i) => {
    const on = i === idx;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
  });
  if (focus) tabs[idx]!.focus();
  tabs[idx]!.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  document.getElementById('pg-stage')!.setAttribute('aria-labelledby', `pg-tab-${active.id}`);
  document.getElementById('pg-pattern-index')!.textContent =
    `${String(idx + 1).padStart(2, '0')} / ${PATTERNS.length}`;
  document.getElementById('pg-pattern-title')!.textContent = active.title;
  document.getElementById('pg-pattern-summary')!.textContent = active.summary;
  bannerText.textContent = active.reduced;
  if (updateHash && location.hash !== `#pattern=${active.id}`)
    history.replaceState(null, '', `#pattern=${active.id}`);
  renderControls();
  copyNote.textContent = '';
  mount();
}

app.listen(tabsEl, 'click', (e) => {
  const t = (e.target as HTMLElement).closest<HTMLButtonElement>('[role="tab"]');
  if (t?.dataset.id) select(t.dataset.id);
});
app.listen(tabsEl, 'keydown', (e) => {
  const i = tabs.indexOf(document.activeElement as HTMLButtonElement);
  if (i < 0) return;
  const next: Record<string, number> = {
    ArrowDown: i + 1,
    ArrowRight: i + 1,
    ArrowUp: i - 1,
    ArrowLeft: i - 1,
    Home: 0,
    End: tabs.length - 1,
  };
  if (!(e.key in next)) return;
  e.preventDefault();
  const j = (next[e.key]! + tabs.length) % tabs.length;
  select(PATTERNS[j]!.id, { focus: true });
});

const fromHash = () => /pattern=([\w-]+)/.exec(location.hash)?.[1];
app.listen(window, 'hashchange', () => {
  const id = fromHash();
  if (id && id !== active.id) select(id, { updateHash: false });
});

// ---------------------------------------------------------------- replay, copy, reduced motion

app.listen(document.getElementById('pg-replay')!, 'click', () => {
  if (current?.replay) current.replay();
  else mount();
});

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.append(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

let noteTimer = 0;
app.listen(document.getElementById('pg-copy')!, 'click', async () => {
  const ok = await copy(codeEl.textContent ?? '');
  const msg = ok
    ? `Copied ${active.title} snippet to clipboard`
    : 'Copy failed — select the code and copy manually';
  statusEl.textContent = msg;
  copyNote.textContent = ok ? 'Copied ✓' : 'Copy failed';
  clearTimeout(noteTimer);
  noteTimer = window.setTimeout(() => {
    copyNote.textContent = '';
    statusEl.textContent = '';
  }, 2400);
});

const syncBanner = () => {
  banner.hidden = !prefersReducedMotion();
};
app.add(
  motionPreference.subscribe(() => {
    syncBanner();
    scheduleRebuild();
  }),
);
syncBanner();

select(fromHash() ?? PATTERNS[0]!.id, { updateHash: false });
