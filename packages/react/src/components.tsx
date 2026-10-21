import { type RevealOptions, type RevealPreset, reveal, revealText } from '@snowbros/motion';
import {
  type ComponentPropsWithoutRef,
  createElement,
  type ElementType,
  type ReactNode,
  useRef,
} from 'react';
import { useSnowbros } from './hooks.js';

type PolymorphicProps<E extends ElementType, P> = P & { as?: E } & Omit<
    ComponentPropsWithoutRef<E>,
    keyof P | 'as'
  >;

export type RevealTextProps<E extends ElementType = 'h2'> = PolymorphicProps<
  E,
  {
    children: ReactNode;
    by?: 'lines' | 'words' | 'chars';
    preset?: RevealPreset;
    trigger?: RevealOptions['trigger'];
    stagger?: number;
    duration?: number;
    delay?: number;
  }
>;

/**
 * Accessible text reveal. Server-renders the plain text; splitting happens after hydration,
 * so the content is readable without JavaScript and by assistive technology.
 *
 * ```tsx
 * <RevealText as="h1" by="lines" preset="rise">Engineering, art-directed.</RevealText>
 * ```
 */
export function RevealText<E extends ElementType = 'h2'>({
  as,
  children,
  by,
  preset,
  trigger,
  stagger,
  duration,
  delay,
  ...rest
}: RevealTextProps<E>) {
  const ref = useRef<HTMLElement>(null);
  useSnowbros(
    (scope) => {
      if (!ref.current) return;
      scope.add(revealText(ref.current, { by, preset, trigger, stagger, duration, delay }));
    },
    [by, preset, trigger, stagger, duration, delay],
  );
  return createElement(as ?? 'h2', { ...rest, ref }, children);
}

export type RevealProps<E extends ElementType = 'div'> = PolymorphicProps<
  E,
  {
    children: ReactNode;
    preset?: RevealPreset;
    /** Reveal direct children one after another instead of the container itself. */
    staggerChildren?: boolean;
    stagger?: number;
    duration?: number;
    delay?: number;
    trigger?: RevealOptions['trigger'];
  }
>;

/** Reveal a block (or its children, staggered) when it enters the viewport. */
export function Reveal<E extends ElementType = 'div'>({
  as,
  children,
  preset,
  staggerChildren,
  stagger,
  duration,
  delay,
  trigger,
  ...rest
}: RevealProps<E>) {
  const ref = useRef<HTMLElement>(null);
  useSnowbros(
    (scope) => {
      const el = ref.current;
      if (!el) return;
      const targets = staggerChildren ? Array.from(el.children) : el;
      scope.add(reveal(targets, { preset, stagger, duration, delay, trigger }));
    },
    [preset, staggerChildren, stagger, duration, delay, trigger],
  );
  return createElement(as ?? 'div', { ...rest, ref }, children);
}
