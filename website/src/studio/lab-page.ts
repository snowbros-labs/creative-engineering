import '../styles/lab.css';
import '../styles/studio.css';
import { createScope, type Scope } from '@snowbros/core';
import { inView } from '@snowbros/motion';
import { initSystem } from '../sections/system';
import { initCopyButtons } from '../ui/copy';
import { $$, initStudioShell } from './shell';

const shell = initStudioShell(['labs']);
const scope = createScope();

// Each bench loads its code when it approaches the viewport; heavy 3D and physics stay out of
// first paint, and each mounts once.
const benches: Record<string, () => Promise<{ init(root: HTMLElement, scope: Scope): void }>> = {
  motion: () => import('../labs/motion-lab'),
  interaction: () => import('../labs/interaction-lab'),
  space: () => import('../labs/space-lab'),
  interface: () => import('../labs/interface-lab'),
  effects: () => import('../labs/effects-lab'),
  physics: () => import('../labs/physics-lab'),
};
for (const root of $$('[data-lab]')) {
  const load = benches[root.dataset.lab ?? ''];
  if (!load) continue;
  let started = false;
  scope.add(
    inView(
      root,
      () => {
        if (started) return;
        started = true;
        load()
          .then((m) => {
            m.init(root, scope);
            shell.frost?.refresh(); // benches change their height as they mount
          })
          .catch((error) => {
            console.error(`[lab] ${root.dataset.lab} bench failed to load`, error);
            root.dataset.labError = 'true';
          });
      },
      { amount: 0, margin: '400px 0px' },
    ),
  );
}

initSystem(scope);
initCopyButtons(scope);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    scope.dispose();
    shell.dispose();
  });
}
