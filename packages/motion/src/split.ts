/**
 * Accessible text splitting.
 *
 * Screen readers can mispronounce text broken into per-character spans. When the element has no
 * interactive descendants, the split copy is `aria-hidden` and an invisible (but readable) copy of
 * the original text is kept alongside. Interactive content (links, buttons) is never hidden:
 * those elements are split by words only, and `chars` is refused with a console warning.
 */

export interface SplitOptions {
  /** Which units to create. Default `['lines', 'words']`. */
  by?: Array<'lines' | 'words' | 'chars'>;
  /** Wrap each line in an overflow-clipped mask (for "rise from below" reveals). Default false. */
  mask?: boolean;
  /** Class prefix. Default `sb`. Produces `sb-line`, `sb-word`, `sb-char`, `sb-mask`. */
  classPrefix?: string;
}

export interface SplitResult {
  lines: HTMLElement[];
  words: HTMLElement[];
  chars: HTMLElement[];
  /** Restore the original markup. */
  revert(): void;
}

const INTERACTIVE = 'a, button, input, select, textarea, [tabindex], [contenteditable]';

const SR_ONLY =
  'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';

/** Grapheme-aware character split so emoji and combined characters stay intact. */
function graphemes(text: string): string[] {
  const Seg = (Intl as typeof Intl & { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (Seg) return Array.from(new Seg(undefined, { granularity: 'grapheme' }).segment(text), (s) => s.segment);
  return Array.from(text);
}

export function splitText(el: HTMLElement, options: SplitOptions = {}): SplitResult {
  const by = new Set(options.by ?? ['lines', 'words']);
  const prefix = options.classPrefix ?? 'sb';
  const original = el.innerHTML;
  const hasInteractive = !!el.querySelector(INTERACTIVE);
  if (hasInteractive && by.has('chars')) {
    console.warn('[snowbros] splitText: element contains interactive content; splitting by words only.', el);
    by.delete('chars');
  }
  const words: HTMLElement[] = [];
  const chars: HTMLElement[] = [];
  let lines: HTMLElement[] = [];

  const makeSpan = (cls: string, text?: string) => {
    const s = document.createElement('span');
    s.className = `${prefix}-${cls}`;
    s.style.display = 'inline-block';
    if (text !== undefined) s.textContent = text;
    return s;
  };

  // Replace text nodes with word (and char) spans, preserving inline elements like <em>/<a>.
  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent ?? '';
        const frag = document.createDocumentFragment();
        for (const part of text.split(/(\s+)/)) {
          if (!part) continue;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(' '));
            continue;
          }
          const word = makeSpan('word');
          if (by.has('chars')) {
            for (const g of graphemes(part)) {
              const c = makeSpan('char', g);
              word.appendChild(c);
              chars.push(c);
            }
          } else {
            word.textContent = part;
          }
          words.push(word);
          frag.appendChild(word);
        }
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
      }
    }
  };

  let container: HTMLElement = el;
  if (!hasInteractive) {
    const srCopy = document.createElement('span');
    srCopy.setAttribute('style', SR_ONLY);
    srCopy.textContent = el.textContent ?? '';
    container = document.createElement('span');
    container.setAttribute('aria-hidden', 'true');
    container.innerHTML = original;
    el.replaceChildren(srCopy, container);
  }
  walk(container);

  // Lines: group words by their rendered top. Only wrap when words are direct children
  // (wrapping across nested inline elements would change semantics).
  if (by.has('lines') && words.length) {
    const groups: HTMLElement[][] = [];
    let lastTop = Number.NaN;
    for (const w of words) {
      const top = w.offsetTop;
      if (groups.length === 0 || Math.abs(top - lastTop) > 2) groups.push([]);
      groups[groups.length - 1]!.push(w);
      lastTop = top;
    }
    const flat = words.every((w) => w.parentElement === container);
    if (flat) {
      container.replaceChildren();
      groups.forEach((group, gi) => {
        const line = makeSpan('line');
        line.style.display = 'block';
        group.forEach((w, i) => {
          line.appendChild(w);
          if (i < group.length - 1) line.appendChild(document.createTextNode(' '));
        });
        if (options.mask) {
          const mask = makeSpan('mask');
          mask.style.display = 'block';
          mask.style.overflow = 'clip';
          // Room for descenders and accents inside the mask.
          mask.style.paddingBlock = '0.08em';
          mask.style.marginBlock = '-0.08em';
          mask.appendChild(line);
          container.appendChild(mask);
        } else {
          container.appendChild(line);
        }
        if (gi < groups.length - 1) container.appendChild(document.createTextNode(' '));
        lines.push(line);
      });
    } else {
      lines = [];
    }
  }

  return {
    lines,
    words,
    chars,
    revert() {
      el.innerHTML = original;
    },
  };
}
