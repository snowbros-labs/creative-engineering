/**
 * Frost — the studio's signature material.
 *
 * One field of crystals lives on the page. Each section offers a zone (`[data-frost]`); the
 * crystals freeze into that zone's form — the wordmark, a project's emblem, the studio mark —
 * and travel, warm, to the next form as you move through the site.
 *
 * Input melts them. Every pointer or touch move is kept as a swept segment from the previous
 * sample, and heat is applied to everything within reach of the whole segment, so a fast gesture
 * thaws its entire path rather than the few points the browser happened to sample. Heat loosens
 * the spring that holds a crystal home and lets a curl-like drift carry it; as heat decays the
 * spring tightens and the crystal snaps back onto one of the three hexagonal axes. Hot crystals
 * are orange (signal), frozen ones take the ink of whatever ground they sit on.
 *
 * Performance model (measured: a full-viewport canvas redrawn on every scroll frame halved the
 * frame rate on CPU raster). Crystals live in DOCUMENT space and the canvas is a document-space
 * element sized to the crystals' bounds, not to the viewport. Native scroll therefore moves a
 * frozen field for free: the ticker sleeps, nothing is redrawn. Frames are drawn only while
 * crystals actually move (thawing, travelling), and only over the area they occupy.
 * Reduced motion: no melting, forms appear in place.
 */
import {
  deviceTier,
  motionPreference,
  Priority,
  prefersReducedMotion,
  ticker,
} from '@snowbros/core';
import { type EmblemKind, emblemPoints, svgPoints, textPoints } from './emblems';

/** The background a crystal is drawn over decides its palette. */
type Ground = 'paper' | 'ink' | 'signal';

interface Zone {
  el: HTMLElement;
  spec: string;
  left: number;
  top: number;
  w: number;
  h: number;
  targets: Float32Array | null;
  targetsKey: string;
}

export interface Frost {
  /** Prefer this zone while it is visible (e.g. the hovered project). `null` clears. */
  prefer(el: HTMLElement | null): void;
  /** A tap or click: a radial thaw at a viewport point. */
  strike(x: number, y: number, strength?: number): void;
  /** Re-measure zones (after layout changes the observers cannot see). */
  refresh(): void;
  dispose(): void;
}

// [frozen, thawing, hot] per ground. Heat is always the warm end of whatever is behind it.
const PALETTES: Record<Ground, [string, string, string]> = {
  paper: ['rgba(17,17,16,0.88)', 'rgba(200,72,30,0.9)', 'rgba(255,79,31,0.95)'],
  ink: ['rgba(242,240,235,0.9)', 'rgba(255,140,100,0.92)', 'rgba(255,79,31,0.95)'],
  signal: ['rgba(17,17,16,0.9)', 'rgba(110,30,8,0.9)', 'rgba(242,240,235,0.95)'],
};
const GROUNDS: Ground[] = ['paper', 'ink', 'signal'];
const AXES = [0, Math.PI / 3, (2 * Math.PI) / 3];
const DISPLAY_FONT = '800 {size} Archivo, "Archivo Fallback", system-ui, sans-serif';
const PAD = 48; // canvas margin around the crystals, px
const SLACK = 192; // backing store grows in steps, so travel does not reallocate every frame

export function createFrost(canvas: HTMLCanvasElement): Frost {
  const ctx = canvas.getContext('2d');
  const noop: Frost = { prefer() {}, strike() {}, refresh() {}, dispose() {} };
  if (!ctx) return noop;

  const coarse = matchMedia('(pointer: coarse)').matches;
  const tier = deviceTier();
  const phone = coarse && innerWidth < 700;
  const N = phone ? 1100 : tier === 'high' ? 2600 : tier === 'mid' ? 1800 : 1100;
  const dprCap = tier === 'low' || phone ? 1.5 : 2;
  const reach = coarse ? 88 : 72;

  // Positions and velocities in document pixels.
  const px = new Float32Array(N);
  const py = new Float32Array(N);
  const vx = new Float32Array(N);
  const vy = new Float32Array(N);
  const heat = new Float32Array(N);
  const hold = new Float32Array(N); // seconds left before a crystal starts travelling to a new form
  const tx = new Float32Array(N); // target, zone-relative
  const ty = new Float32Array(N);
  const axis = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    axis[i] = i % 3;
    px[i] = Math.random() * innerWidth;
    py[i] = -40 - Math.random() * 200;
  }

  const zones: Zone[] = Array.from(document.querySelectorAll<HTMLElement>('[data-frost]')).map(
    (el) => ({
      el,
      spec: el.dataset.frost ?? 'mark',
      left: 0,
      top: 0,
      w: 0,
      h: 0,
      targets: null,
      targetsKey: '',
    }),
  );

  // Document-space bands: [top, bottom, groundIndex], from sections marked data-frost-bg.
  const bandEls = Array.from(document.querySelectorAll<HTMLElement>('[data-frost-bg]'));
  let bands: number[] = [];
  const lists = new Uint16Array(9);
  const order = new Uint16Array(9 * N);

  let reduced = prefersReducedMotion();
  let vh = innerHeight;
  let docW = document.documentElement.clientWidth;
  let dpr = Math.min(dprCap, devicePixelRatio || 1);
  let active: Zone | null = null;
  let preferred: HTMLElement | null = null;
  let alpha = 0;
  let time = 0;
  let unsub: (() => void) | null = null;
  let disposed = false;
  // Canvas placement in document space, and its allocated backing size (CSS px).
  let bx = 0;
  let by = 0;
  let bw = 0;
  let bh = 0;
  let allocW = 0;
  let allocH = 0;
  // Pending input: swept segments [x0, y0, x1, y1, speed px/s] in document space.
  const segs: number[] = [];
  const strikes: number[] = [];

  function measure(): void {
    const sy = scrollY;
    const sx = scrollX;
    vh = innerHeight;
    docW = document.documentElement.clientWidth;
    dpr = Math.min(dprCap, devicePixelRatio || 1);
    for (const z of zones) {
      const r = z.el.getBoundingClientRect();
      z.left = r.left + sx;
      z.top = r.top + sy;
      z.w = r.width;
      z.h = r.height;
    }
    bands = [];
    for (const el of bandEls) {
      const r = el.getBoundingClientRect();
      const g = GROUNDS.indexOf((el.dataset.frostBg as Ground) ?? 'paper');
      bands.push(r.top + sy, r.bottom + sy, g < 0 ? 0 : g);
    }
    if (active) {
      const before = active.targetsKey;
      ensureTargets(active);
      if (active.targetsKey !== before) retarget(active);
    }
    wake();
  }

  function ensureTargets(z: Zone): Float32Array {
    const key = `${Math.round(z.w)}x${Math.round(z.h)}`;
    if (z.targets && z.targetsKey === key) return z.targets;
    let pts: Float32Array;
    if (z.spec === 'wordmark') {
      const lines = z.w / Math.max(1, z.h) < 2.4 ? ['SNOW', 'BROS'] : ['SNOWBROS'];
      const logo = document.querySelector<SVGSVGElement>('.foot-word .logo');
      pts =
        lines.length === 1 && logo
          ? svgPoints(logo, z.w, z.h, N)
          : textPoints(lines, z.w, z.h, N, DISPLAY_FONT);
    } else if (z.spec.startsWith('text:')) {
      // `text:VED` or `text:VED|CHAUHAN` — one line per `|`.
      pts = textPoints(z.spec.slice(5).split('|'), z.w, z.h, N, DISPLAY_FONT);
    } else {
      const kind = (z.spec.startsWith('emblem:') ? z.spec.slice(7) : 'mark') as EmblemKind;
      pts = emblemPoints(kind, z.w, z.h, N);
    }
    z.targets = pts;
    z.targetsKey = key;
    return pts;
  }

  /** Map crystals onto a new form: both sorted left to right, so the change sweeps across. */
  function retarget(z: Zone): void {
    const pts = ensureTargets(z);
    const pi = Array.from({ length: N }, (_, i) => i).sort((a, b) => (px[a] ?? 0) - (px[b] ?? 0));
    const ti = Array.from({ length: N }, (_, i) => i).sort(
      (a, b) => (pts[a * 2] ?? 0) - (pts[b * 2] ?? 0),
    );
    for (let k = 0; k < N; k++) {
      const i = pi[k] ?? k;
      const t = ti[k] ?? k;
      tx[i] = pts[t * 2] ?? 0;
      ty[i] = pts[t * 2 + 1] ?? 0;
      if (reduced) {
        px[i] = z.left + (tx[i] ?? 0);
        py[i] = z.top + (ty[i] ?? 0);
        vx[i] = 0;
        vy[i] = 0;
        heat[i] = 0;
        hold[i] = 0;
      } else {
        // Travel: crystals ride from the last form to this one, warm while in flight, and
        // freeze on arrival. The sweep runs left to right, staggered across the swarm.
        hold[i] = (k / N) * 0.32;
        heat[i] = Math.min(1, (heat[i] ?? 0) + 0.55);
      }
    }
  }

  function pickZone(): Zone | null {
    const sy = scrollY;
    let best: Zone | null = null;
    let bestArea = 0;
    for (const z of zones) {
      const top = z.top - sy;
      const visible = Math.max(0, Math.min(vh, top + z.h) - Math.max(0, top));
      const ratio = z.h > 0 ? visible / z.h : 0;
      if (ratio < 0.35) continue;
      const area = visible * z.w * (z.el === preferred ? 4 : 1);
      if (area > bestArea) {
        bestArea = area;
        best = z;
      }
    }
    return best;
  }

  function wake(): void {
    if (!unsub && !disposed) unsub = ticker.add(frame, Priority.render);
  }

  function sleep(): void {
    unsub?.();
    unsub = null;
  }

  function applyInput(): void {
    if (reduced) {
      segs.length = 0;
      strikes.length = 0;
      return;
    }
    for (let s = 0; s < segs.length; s += 5) {
      const x0 = segs[s] ?? 0;
      const y0 = segs[s + 1] ?? 0;
      const x1 = segs[s + 2] ?? 0;
      const y1 = segs[s + 3] ?? 0;
      const speed = segs[s + 4] ?? 0;
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len2 = dx * dx + dy * dy || 1;
      const len = Math.sqrt(len2);
      const melt = Math.min(1, Math.max(0.08, speed / 1400));
      const ux = dx / len;
      const uy = dy / len;
      const minX = Math.min(x0, x1) - reach;
      const maxX = Math.max(x0, x1) + reach;
      const minY = Math.min(y0, y1) - reach;
      const maxY = Math.max(y0, y1) + reach;
      for (let i = 0; i < N; i++) {
        const x = px[i] ?? 0;
        const y = py[i] ?? 0;
        if (x < minX || x > maxX || y < minY || y > maxY) continue;
        // Distance to the swept segment, not to a sampled point.
        const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / len2));
        const cx = x - (x0 + dx * t);
        const cy = y - (y0 + dy * t);
        const d = Math.sqrt(cx * cx + cy * cy);
        if (d >= reach) continue;
        const w = (1 - d / reach) ** 2;
        heat[i] = Math.min(1, (heat[i] ?? 0) + w * melt * 1.1);
        const push = Math.min(speed, 2600) * w * 0.32;
        const side = d > 0.001 ? 90 * w * melt : 0;
        vx[i] = (vx[i] ?? 0) + ux * push + (cx / (d || 1)) * side;
        vy[i] = (vy[i] ?? 0) + uy * push + (cy / (d || 1)) * side;
      }
    }
    segs.length = 0;
    for (let s = 0; s < strikes.length; s += 3) {
      const sx = strikes[s] ?? 0;
      const sy = strikes[s + 1] ?? 0;
      const strength = strikes[s + 2] ?? 1;
      const r = reach * 1.6;
      for (let i = 0; i < N; i++) {
        const cx = (px[i] ?? 0) - sx;
        const cy = (py[i] ?? 0) - sy;
        const d = Math.sqrt(cx * cx + cy * cy);
        if (d >= r) continue;
        const w = (1 - d / r) ** 1.5;
        heat[i] = Math.min(1, (heat[i] ?? 0) + w * strength);
        const out = 720 * w * strength;
        vx[i] = (vx[i] ?? 0) + (cx / (d || 1)) * out;
        vy[i] = (vy[i] ?? 0) + (cy / (d || 1)) * out;
      }
    }
    strikes.length = 0;
  }

  function step(dt: number): boolean {
    const z = active;
    const ox = z ? z.left : 0;
    const oy = z ? z.top : 0;
    const decay = Math.exp(-dt * 1.05);
    let busy = false;
    for (let i = 0; i < N; i++) {
      let h = heat[i] ?? 0;
      let x = px[i] ?? 0;
      let y = py[i] ?? 0;
      let ax: number;
      let ay: number;
      const hl = hold[i] ?? 0;
      if (z && hl <= 0) {
        const k = 170 * (1 - 0.9 * h);
        const c = 2 * Math.sqrt(k) * 0.88;
        ax = k * (ox + (tx[i] ?? 0) - x) - c * (vx[i] ?? 0);
        ay = k * (oy + (ty[i] ?? 0) - y) - c * (vy[i] ?? 0);
      } else {
        if (hl > 0) hold[i] = hl - dt;
        ax = -2.5 * (vx[i] ?? 0);
        ay = -2.5 * (vy[i] ?? 0);
      }
      if (h > 0.02) {
        // Curl-like drift while thawed: it is what makes melt read as material, not as noise.
        ax += Math.sin(y * 0.013 + time * 1.4) * Math.cos(x * 0.009) * 260 * h;
        ay += Math.cos(x * 0.011 - time * 1.1) * Math.sin(y * 0.008) * 200 * h - 40 * h;
      }
      const nvx = (vx[i] ?? 0) + ax * dt;
      const nvy = (vy[i] ?? 0) + ay * dt;
      x += nvx * dt;
      y += nvy * dt;
      vx[i] = nvx;
      vy[i] = nvy;
      px[i] = x;
      py[i] = y;
      h *= decay;
      heat[i] = h;
      if (!busy) {
        const far = z ? Math.abs(ox + (tx[i] ?? 0) - x) + Math.abs(oy + (ty[i] ?? 0) - y) : 0;
        if (h > 0.02 || nvx * nvx + nvy * nvy > 9 || far > 0.6 || hl > 0) busy = true;
      } else if (z && hl <= 0 && h < 0.02 && nvx * nvx + nvy * nvy < 9) {
        // Settled crystals snap exactly home, so the next scroll needs no redraw at all.
        const fx = ox + (tx[i] ?? 0);
        const fy = oy + (ty[i] ?? 0);
        if (Math.abs(fx - x) + Math.abs(fy - y) < 0.6) {
          px[i] = fx;
          py[i] = fy;
        }
      }
    }
    return busy;
  }

  /** Fit the canvas to the crystals near the viewport. Placement is a transform; size changes in steps. */
  function place(): void {
    const sy = scrollY;
    const top = sy - vh;
    const bottom = sy + vh * 2;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < N; i++) {
      const y = py[i] ?? 0;
      if (y < top || y > bottom) continue;
      const x = px[i] ?? 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    if (minX === Infinity) {
      bw = 0;
      bh = 0;
      return;
    }
    bx = Math.max(0, Math.floor(minX - PAD));
    by = Math.max(0, Math.floor(minY - PAD));
    bw = Math.min(docW - bx, Math.ceil(maxX + PAD) - bx);
    bh = Math.ceil(maxY + PAD) - by;
    if (bw > allocW || bh > allocH || bw < allocW * 0.4 || bh < allocH * 0.4) {
      allocW = Math.min(docW, Math.ceil((bw + SLACK) / SLACK) * SLACK);
      allocH = Math.ceil((bh + SLACK) / SLACK) * SLACK;
      canvas.width = Math.round(allocW * dpr);
      canvas.height = Math.round(allocH * dpr);
      canvas.style.width = `${allocW}px`;
      canvas.style.height = `${allocH}px`;
    }
    canvas.style.transform = `translate3d(${bx}px, ${by}px, 0)`;
  }

  function draw(): void {
    place();
    ctx!.setTransform(1, 0, 0, 1, 0, 0);
    ctx!.clearRect(0, 0, canvas.width, canvas.height);
    if (alpha <= 0.001 || bw === 0) return;
    ctx!.setTransform(dpr, 0, 0, dpr, -bx * dpr, -by * dpr);
    ctx!.globalAlpha = alpha;
    ctx!.lineWidth = phone ? 1.15 : 1.3;
    ctx!.lineCap = 'round';
    // One pass: sort crystals into 9 lists (3 grounds × 3 heat buckets), then stroke each.
    const left = bx;
    const right = bx + bw;
    const top = by;
    const bottom = by + bh;
    lists.fill(0);
    for (let i = 0; i < N; i++) {
      const x = px[i] ?? 0;
      const y = py[i] ?? 0;
      if (x < left || y < top || x > right || y > bottom) continue;
      let g = 0;
      for (let k = 0; k < bands.length; k += 3) {
        // Later bands are nested inside earlier ones (document order), so the last match wins.
        if (y >= (bands[k] ?? 0) && y < (bands[k + 1] ?? 0)) g = bands[k + 2] ?? 0;
      }
      const h = heat[i] ?? 0;
      const list = g * 3 + (h < 0.16 ? 0 : h < 0.5 ? 1 : 2);
      const n = lists[list] ?? 0;
      order[list * N + n] = i;
      lists[list] = n + 1;
    }
    for (let list = 0; list < 9; list++) {
      const count = lists[list] ?? 0;
      if (!count) continue;
      const g = Math.floor(list / 3);
      const b = list % 3;
      ctx!.beginPath();
      for (let j = 0; j < count; j++) {
        const i = order[list * N + j] ?? 0;
        const x = px[i] ?? 0;
        const y = py[i] ?? 0;
        const sx = vx[i] ?? 0;
        const svy = vy[i] ?? 0;
        const sp = Math.sqrt(sx * sx + svy * svy);
        const l = 2.1 + Math.min(15, sp * 0.016);
        const a = sp > 60 ? Math.atan2(svy, sx) : (AXES[axis[i] ?? 0] ?? 0);
        const cx = Math.cos(a) * l;
        const cy = Math.sin(a) * l;
        ctx!.moveTo(x - cx, y - cy);
        ctx!.lineTo(x + cx, y + cy);
        // One crystal in seven is a full three-axis flake while frozen.
        if (b === 0 && i % 7 === 0 && sp < 60) {
          for (let k = 1; k < 3; k++) {
            const aa = AXES[k] ?? 0;
            const dx = Math.cos(aa) * 2.6;
            const dy = Math.sin(aa) * 2.6;
            ctx!.moveTo(x - dx, y - dy);
            ctx!.lineTo(x + dx, y + dy);
          }
        }
      }
      const palette = PALETTES[GROUNDS[g] ?? 'paper'];
      ctx!.strokeStyle = palette[b] ?? palette[0];
      ctx!.stroke();
    }
    ctx!.globalAlpha = 1;
  }

  function frame({ delta }: { delta: number }): void {
    const next = pickZone();
    if (next !== active) {
      active = next;
      if (active) retarget(active);
    }
    const goal = active ? 1 : 0;
    alpha += (goal - alpha) * Math.min(1, delta * (reduced ? 60 : 5));
    if (Math.abs(goal - alpha) < 0.003) alpha = goal;
    applyInput();
    time += delta;
    let busy = false;
    const sub = delta > 1 / 50 ? 2 : 1;
    for (let s = 0; s < sub; s++) busy = step(delta / sub) || busy;
    draw();
    const fading = alpha !== goal;
    if (!busy && !fading && segs.length === 0) sleep();
    if (!active && alpha === 0) sleep();
  }

  // ---- input: keep the path, not just the point (document space)
  let last: { x: number; y: number; t: number } | null = null;
  const push = (cx: number, cy: number, t: number): void => {
    const x = cx + scrollX;
    const y = cy + scrollY;
    if (last && t - last.t < 120) {
      const dt = Math.max(0.004, (t - last.t) / 1000);
      // Speed of the hand over the screen: scrolling under a still finger is not a gesture.
      const speed = Math.hypot(x - last.x, y - last.y) / dt;
      segs.push(last.x, last.y, x, y, speed);
      if (segs.length > 400) segs.splice(0, segs.length - 400);
      wake();
    }
    last = { x, y, t };
  };
  const onPointerMove = (e: PointerEvent): void => {
    if (e.pointerType === 'touch') return; // touch is handled by touchmove, which keeps firing while scrolling
    if (!active) return;
    const events = e.getCoalescedEvents?.() ?? [];
    if (events.length > 1) for (const c of events) push(c.clientX, c.clientY, c.timeStamp);
    else push(e.clientX, e.clientY, e.timeStamp);
  };
  const onTouchMove = (e: TouchEvent): void => {
    const t = e.touches[0];
    if (t && active) push(t.clientX, t.clientY, e.timeStamp);
  };
  const onTouchStart = (e: TouchEvent): void => {
    const t = e.touches[0];
    last = t ? { x: t.clientX + scrollX, y: t.clientY + scrollY, t: e.timeStamp } : null;
  };
  const onLeave = (): void => {
    last = null;
  };
  // Scrolling a frozen field costs nothing; only wake when the visible form should change.
  const onScroll = (): void => {
    if (pickZone() !== active) wake();
  };
  const onVisibility = (): void => {
    if (!document.hidden) wake();
  };
  const onResize = (): void => measure();

  addEventListener('pointermove', onPointerMove, { passive: true });
  addEventListener('touchstart', onTouchStart, { passive: true });
  addEventListener('touchmove', onTouchMove, { passive: true });
  addEventListener('touchend', onLeave, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onResize);
  addEventListener('load', measure, { once: true });
  document.addEventListener('visibilitychange', onVisibility);
  // Zones move when anything above them changes height (lazy images, fonts, benches mounting),
  // not only when they resize themselves: watch the document too.
  const ro = new ResizeObserver(() => measure());
  for (const z of zones) ro.observe(z.el);
  ro.observe(document.body);
  const unsubMotion = motionPreference.subscribe((v) => {
    reduced = v === 'reduced';
    if (active) retarget(active);
    wake();
  });

  measure();
  document.fonts?.ready.then(() => {
    for (const z of zones) z.targets = null; // re-sample text in the real face
    if (active) retarget(active);
    wake();
  });
  document.documentElement.classList.add('frost-on');
  (window as unknown as { __frost?: unknown }).__frost = {
    awake: () => unsub !== null,
    active: () => active?.spec ?? null,
  };

  return {
    prefer(el) {
      preferred = el;
      wake();
    },
    strike(x, y, strength = 0.9) {
      strikes.push(x + scrollX, y + scrollY, strength);
      wake();
    },
    refresh: measure,
    dispose() {
      disposed = true;
      sleep();
      removeEventListener('pointermove', onPointerMove);
      removeEventListener('touchstart', onTouchStart);
      removeEventListener('touchmove', onTouchMove);
      removeEventListener('touchend', onLeave);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onResize);
      removeEventListener('load', measure);
      document.removeEventListener('visibilitychange', onVisibility);
      ro.disconnect();
      unsubMotion();
      document.documentElement.classList.remove('frost-on');
    },
  };
}
