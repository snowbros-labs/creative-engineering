/**
 * Target resolution and property accessors.
 *
 * DOM elements get individually animatable transform components (`x`, `y`, `scale`, `rotate`…)
 * composed into one `transform` in a fixed order, so several tweens can drive different
 * components of the same element without overwriting each other.
 * Plain objects (e.g. a Three.js `Vector3`, a uniform's `value`, a chart datum) are written directly.
 */

export type TargetInput =
  | string
  | Element
  | object
  | ArrayLike<Element | object>
  | null
  | undefined;

export function resolveTargets(input: TargetInput, root: ParentNode | null = null): object[] {
  if (input == null) return [];
  if (typeof input === 'string') {
    const scope = root ?? (typeof document !== 'undefined' ? document : null);
    return scope ? Array.from(scope.querySelectorAll(input)) : [];
  }
  if (isArrayLike(input)) return Array.from(input as ArrayLike<object>).filter(Boolean);
  return [input];
}

function isArrayLike(v: unknown): boolean {
  if (Array.isArray(v)) return true;
  if (typeof NodeList !== 'undefined' && v instanceof NodeList) return true;
  if (typeof HTMLCollection !== 'undefined' && v instanceof HTMLCollection) return true;
  return false;
}

const isElement = (t: object): t is HTMLElement | SVGElement =>
  typeof Element !== 'undefined' && t instanceof Element;

const TRANSFORM_DEFAULTS = {
  x: 0,
  y: 0,
  z: 0,
  rotate: 0,
  rotateX: 0,
  rotateY: 0,
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  skewX: 0,
  skewY: 0,
} as const;

export type TransformKey = keyof typeof TRANSFORM_DEFAULTS;
const TRANSFORM_KEYS = new Set<string>(Object.keys(TRANSFORM_DEFAULTS));
export const isTransformKey = (k: string): k is TransformKey => TRANSFORM_KEYS.has(k);

const DEFAULT_UNIT: Record<TransformKey, string> = {
  x: 'px',
  y: 'px',
  z: 'px',
  rotate: 'deg',
  rotateX: 'deg',
  rotateY: 'deg',
  scale: '',
  scaleX: '',
  scaleY: '',
  skewX: 'deg',
  skewY: 'deg',
};

type TransformState = Record<TransformKey, string | number>;
const transformCache = new WeakMap<Element, TransformState>();

function getTransformState(el: Element): TransformState {
  let state = transformCache.get(el);
  if (!state) {
    state = { ...TRANSFORM_DEFAULTS };
    transformCache.set(el, state);
  }
  return state;
}

const withUnit = (v: string | number, unit: string) => (typeof v === 'number' ? `${v}${unit}` : v);

/** Compose the cached components into a transform string. Identity parts are omitted. */
export function composeTransform(s: TransformState): string {
  const parts: string[] = [];
  if (s.x !== 0 || s.y !== 0 || s.z !== 0) {
    parts.push(
      `translate3d(${withUnit(s.x, 'px')}, ${withUnit(s.y, 'px')}, ${withUnit(s.z, 'px')})`,
    );
  }
  if (s.rotate !== 0) parts.push(`rotate(${withUnit(s.rotate, 'deg')})`);
  if (s.rotateX !== 0) parts.push(`rotateX(${withUnit(s.rotateX, 'deg')})`);
  if (s.rotateY !== 0) parts.push(`rotateY(${withUnit(s.rotateY, 'deg')})`);
  if (s.scale !== 1) parts.push(`scale(${s.scale})`);
  if (s.scaleX !== 1) parts.push(`scaleX(${s.scaleX})`);
  if (s.scaleY !== 1) parts.push(`scaleY(${s.scaleY})`);
  if (s.skewX !== 0) parts.push(`skewX(${withUnit(s.skewX, 'deg')})`);
  if (s.skewY !== 0) parts.push(`skewY(${withUnit(s.skewY, 'deg')})`);
  return parts.length ? parts.join(' ') : 'none';
}

export interface Accessor {
  get(): string | number;
  set(value: string | number): void;
  /** Unit applied to bare numbers (transforms only). */
  unit: string;
}

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

/** Build a getter/setter for `prop` on `target`. */
export function accessor(target: object, prop: string): Accessor {
  if (isElement(target)) {
    const el = target as HTMLElement;
    if (isTransformKey(prop)) {
      const state = getTransformState(el);
      return {
        unit: DEFAULT_UNIT[prop],
        get: () => state[prop],
        set: (v) => {
          state[prop] = v;
          el.style.transform = composeTransform(state);
        },
      };
    }
    if (prop.startsWith('attr:')) {
      const name = prop.slice(5);
      return {
        unit: '',
        get: () => el.getAttribute(name) ?? 0,
        set: (v) => el.setAttribute(name, String(v)),
      };
    }
    const cssName = prop.startsWith('--') ? prop : kebab(prop);
    return {
      unit: '',
      get: () => {
        const inline = el.style.getPropertyValue(cssName);
        if (inline) return inline;
        const computed =
          typeof getComputedStyle === 'function'
            ? getComputedStyle(el).getPropertyValue(cssName)
            : '';
        return computed.trim() || (cssName === 'opacity' ? 1 : 0);
      },
      set: (v) => el.style.setProperty(cssName, String(v)),
    };
  }
  const obj = target as Record<string, unknown>;
  return {
    unit: '',
    get: () => (obj[prop] as string | number | undefined) ?? 0,
    set: (v) => {
      obj[prop] = v;
    },
  };
}

/** Forget cached transform components (after an external style reset). */
export function clearTransformCache(el: Element): void {
  transformCache.delete(el);
}
