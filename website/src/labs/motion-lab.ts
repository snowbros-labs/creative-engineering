/**
 * Lab A — Motion. A sentence, a curve, a stagger: rebuilds a real `timeline()` on every change,
 * plays it, and lets the visitor scrub it by hand. The code panel is generated from the same
 * values, so what you copy is what you saw. Reduced motion: timelines jump to the end (`skip`);
 * the scrubber still works because seeking is not animation.
 */
import { cubicBezier, type EaseFn, linear, type Scope, springEase } from '@snowbros/core';
import {
  type Props,
  type SplitResult,
  splitText,
  stagger,
  type Timeline,
  timeline,
} from '@snowbros/motion';

type By = 'lines' | 'words' | 'chars';
type From = 'below' | 'above' | 'fade';

const CURVES: Record<string, { fn: EaseFn; code: string; spring?: boolean }> = {
  editorial: { fn: cubicBezier(0.16, 1, 0.3, 1), code: "'cubic-bezier(0.16, 1, 0.3, 1)'" },
  spring: { fn: springEase('smooth').ease, code: "springEase('smooth').ease", spring: true },
  snap: { fn: cubicBezier(0.2, 0, 0, 1), code: "'cubic-bezier(0.2, 0, 0, 1)'" },
  linear: { fn: linear, code: "'linear'" },
};

/** Draw each curve as its own icon — sampled from the real easing function. */
function drawCurves(root: HTMLElement) {
  for (const path of root.querySelectorAll<SVGPathElement>('[data-curve]')) {
    const fn = CURVES[path.dataset.curve!]?.fn ?? linear;
    let d = '';
    for (let i = 0; i <= 32; i++) {
      const t = i / 32;
      d += `${i ? 'L' : 'M'}${(4 + t * 32).toFixed(2)} ${(36 - fn(t) * 32).toFixed(2)}`;
    }
    path.setAttribute('d', d);
  }
}

export function init(root: HTMLElement, scope: Scope): void {
  const text = root.querySelector<HTMLElement>('[data-ml-text]');
  const form = root.querySelector<HTMLFormElement>('[data-ml-form]');
  const scrubEl = root.querySelector<HTMLInputElement>('[data-ml-scrub]');
  const scrubOut = root.querySelector('[data-ml-scrub-out]');
  const code = root.querySelector('[data-code="ml"]');
  if (!text || !form || !scrubEl || !code) return;
  drawCurves(root);

  let split: SplitResult | null = null;
  let tl: Timeline | null = null;
  const teardown = () => {
    tl?.kill();
    tl = null;
    split?.revert();
    split = null;
  };
  scope.add(teardown);

  const read = () => {
    const f = new FormData(form);
    return {
      by: (f.get('by') as By) ?? 'words',
      ease: String(f.get('ease') ?? 'editorial'),
      stagger: Number(f.get('stagger') ?? 0.04),
      duration: Number(f.get('duration') ?? 0.8),
      from: (f.get('from') as From) ?? 'below',
    };
  };

  const propsFor = (from: From, masked: boolean): Props =>
    from === 'fade'
      ? { opacity: [0, 1] }
      : masked
        ? { y: from === 'below' ? ['110%', '0%'] : ['-110%', '0%'] }
        : { y: from === 'below' ? [24, 0] : [-24, 0], opacity: [0, 1] };

  const render = (autoplay: boolean) => {
    const v = read();
    teardown();
    // Masks only for lines rising/falling; words and chars move inside the line box.
    const masked = v.by === 'lines' && v.from !== 'fade';
    split = splitText(text, { by: [v.by], mask: masked });
    const units = split[v.by];
    const curve = CURVES[v.ease] ?? CURVES.editorial!;
    tl = timeline().to(units, propsFor(v.from, masked), {
      duration: v.duration,
      ease: curve.fn,
      stagger: stagger(v.stagger, { from: 'start' }),
    });
    tl.seek(autoplay ? 0 : 1);
    if (autoplay) tl.play();
    scrubEl.value = autoplay ? '0' : '1';
    if (scrubOut) scrubOut.textContent = Number(scrubEl.value).toFixed(3);
    code.textContent = snippet(v, curve.code, masked, !!curve.spring);
  };

  // Keep the scrubber in sync while playing; stop updating once finished.
  const sync = () => {
    if (!tl) return;
    scrubEl.value = String(tl.progress);
    if (scrubOut) scrubOut.textContent = tl.progress.toFixed(3);
    if (tl.state === 'running') frame = requestAnimationFrame(sync);
  };
  let frame = 0;
  scope.add(() => cancelAnimationFrame(frame));
  const play = () => {
    render(true);
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(sync);
  };

  for (const out of root.querySelectorAll<HTMLOutputElement>('[data-out]')) {
    const input = form.elements.namedItem(out.dataset.out!) as HTMLInputElement | null;
    if (!input) continue;
    const fmt = () => {
      out.textContent = `${Math.round(Number(input.value) * 1000)} ms`;
    };
    fmt();
    scope.listen(input, 'input', fmt);
  }
  scope.listen(form, 'change', play);
  scope.listen(scrubEl, 'input', () => {
    if (!tl) return;
    cancelAnimationFrame(frame);
    tl.pause();
    tl.seek(Number(scrubEl.value));
    if (scrubOut) scrubOut.textContent = Number(scrubEl.value).toFixed(3);
  });
  // Clicking the specimen replays it — the bench is the play button.
  const specimen = root.querySelector('[data-ml-specimen]');
  if (specimen)
    scope.listen(specimen, 'click', (e: Event) => {
      if ((e.target as Element).closest('input, label')) return;
      play();
    });
  const playBtn = root.querySelector('[data-ml-play]');
  const resetBtn = root.querySelector('[data-ml-reset]');
  if (playBtn) scope.listen(playBtn, 'click', play);
  if (resetBtn)
    scope.listen(resetBtn, 'click', () => {
      form.reset();
      for (const out of root.querySelectorAll<HTMLOutputElement>('[data-out]')) {
        const input = form.elements.namedItem(out.dataset.out!) as HTMLInputElement | null;
        if (input) out.textContent = `${Math.round(Number(input.value) * 1000)} ms`;
      }
      play();
    });

  render(false);
  // First visit: play once so the bench introduces itself.
  play();
}

function snippet(
  v: { by: By; stagger: number; duration: number; from: From },
  ease: string,
  masked: boolean,
  spring: boolean,
): string {
  const props =
    v.from === 'fade'
      ? '{ opacity: [0, 1] }'
      : masked
        ? `{ y: ['${v.from === 'below' ? '' : '-'}110%', '0%'] }`
        : `{ y: [${v.from === 'below' ? 24 : -24}, 0], opacity: [0, 1] }`;
  const imports = spring
    ? "import { springEase } from '@snowbros/core';\nimport { splitText, stagger, timeline } from '@snowbros/motion';"
    : "import { splitText, stagger, timeline } from '@snowbros/motion';";
  return `${imports}

const split = splitText(el, { by: ['${v.by}']${masked ? ', mask: true' : ''} });
const tl = timeline().to(split.${v.by}, ${props}, {
  duration: ${v.duration},
  ease: ${ease},
  stagger: stagger(${v.stagger}),
});
tl.play(); // or scrub(tl, scrollProgress(el)) to tie it to scroll`;
}
