import '../styles/studio.css';
import '../styles/founder.css';
import { prefersReducedMotion, ticker } from '@snowbros/core';
import { inView } from '@snowbros/motion';
import { exeLinks } from './exe-link';
import { $, initStudioShell } from './shell';

const shell = initStudioShell([]);
const disposeExe = exeLinks();

// `cargo run`: when the struct enters view, its println! output types itself out — the real
// output of the real code above it. The full sentence is in the DOM from the start (no JS, screen
// readers); only the visible characters are revealed.
const print = $<HTMLOutputElement>('[data-println]');
let stopTyping: (() => void) | null = null;
if (print && !prefersReducedMotion()) {
  const text = print.textContent ?? '';
  print.setAttribute('aria-label', text);
  const shown = document.createElement('span');
  shown.setAttribute('aria-hidden', 'true');
  print.replaceChildren(shown);
  print.classList.add('is-waiting');
  inView(
    print,
    () => {
      print.classList.remove('is-waiting');
      print.classList.add('is-typing');
      let t = -0.35; // a beat for "compiling"
      stopTyping = ticker.add(({ delta }) => {
        t += delta;
        const n = Math.max(0, Math.min(text.length, Math.floor(t * 38)));
        shown.textContent = text.slice(0, n);
        if (n >= text.length) {
          print.classList.remove('is-typing');
          print.classList.add('is-done');
          stopTyping?.();
          stopTyping = null;
        }
      });
    },
    { amount: 0.6 },
  );
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stopTyping?.();
    disposeExe();
    shell.dispose();
  });
}
