/**
 * Value interpolation. Any two values with the same "shape" interpolate:
 * numbers, `12px`, `rgb()/#hex` colors, and complex strings such as
 * `inset(0% 0% 100% 0%)` or `polygon(...)` — numbers inside are tweened, text is kept.
 */

export type Interpolator = (t: number) => string | number;

const NUMBER = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;
const HEX = /#([0-9a-f]{3,8})\b/gi;

function hexToRgba(hex: string): string {
  let h = hex.slice(1);
  if (h.length === 3 || h.length === 4) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  const a = h.length === 8 ? Number.parseInt(h.slice(6, 8), 16) / 255 : 1;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Normalise colors so `#fff` can tween to `rgba(0,0,0,0.5)`. */
function normalise(value: string): string {
  return value
    .replace(HEX, (m) => hexToRgba(m))
    .replace(/rgb\(\s*([^,)]+),\s*([^,)]+),\s*([^,)]+)\)/g, 'rgba($1, $2, $3, 1)')
    .replace(/\btransparent\b/g, 'rgba(0, 0, 0, 0)');
}

const COLOR_FN = /rgba\(/;

export function interpolate(from: string | number, to: string | number): Interpolator {
  if (typeof from === 'number' && typeof to === 'number') {
    return (t) => from + (to - from) * t;
  }
  const a = normalise(String(from));
  const b = normalise(String(to));
  const numsA = a.match(NUMBER) ?? [];
  const numsB = b.match(NUMBER) ?? [];
  const partsB = b.split(NUMBER);
  if (numsA.length !== numsB.length || numsB.length === 0) {
    // Not interpolatable: switch at the end (discrete, like CSS `display`).
    return (t) => (t < 1 ? from : to);
  }
  const fa = numsA.map(Number);
  const fb = numsB.map(Number);
  const isColor = COLOR_FN.test(b);
  return (t) => {
    let out = partsB[0] ?? '';
    for (let i = 0; i < fb.length; i++) {
      let v = fa[i]! + (fb[i]! - fa[i]!) * t;
      if (isColor) {
        // Channels inside rgba(): round RGB, keep alpha precise.
        const isAlpha = (i + 1) % 4 === 0;
        v = isAlpha ? Math.round(v * 1000) / 1000 : Math.round(v);
      } else {
        v = Math.round(v * 10000) / 10000;
      }
      out += String(v) + (partsB[i + 1] ?? '');
    }
    return out;
  };
}

/** Split `"24px"` into `[24, "px"]`. Plain numbers give an empty unit. */
export function parseUnit(value: string | number): [number, string] {
  if (typeof value === 'number') return [value, ''];
  const m = /^(-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)([a-z%]*)$/i.exec(value.trim());
  return m ? [Number(m[1]), m[2] ?? ''] : [Number.NaN, ''];
}
