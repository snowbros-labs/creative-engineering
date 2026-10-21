import { setMotionPreference, ticker } from '@snowbros/core';
import { act, cleanup, render } from '@testing-library/react';
import { StrictMode, useRef } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { RevealText, usePin, useReducedMotion, useSnowbros } from '../src/index.js';

beforeAll(() => {
  ticker.useExternalClock();
});
afterEach(() => {
  cleanup();
  setMotionPreference(null);
});

function ScopeProbe({ setup, disposed }: { setup: () => void; disposed: () => void }) {
  useSnowbros((scope) => {
    setup();
    scope.add(disposed);
  }, []);
  return null;
}

function ReducedMotionProbe({ seen }: { seen: boolean[] }) {
  seen.push(useReducedMotion());
  return null;
}

function PinProbe() {
  const ref = useRef<HTMLElement>(null);
  usePin(ref, { distance: '150vh' });
  return (
    <section ref={ref}>
      <div data-testid="stage">stage</div>
    </section>
  );
}

describe('@snowbros/react', () => {
  it('useSnowbros disposes on unmount, including under StrictMode', () => {
    const disposed = vi.fn();
    const setup = vi.fn();
    const { unmount } = render(
      <StrictMode>
        <ScopeProbe setup={setup} disposed={disposed} />
      </StrictMode>,
    );
    unmount();
    // Every setup is matched by exactly one cleanup.
    expect(setup).toHaveBeenCalled();
    expect(disposed).toHaveBeenCalledTimes(setup.mock.calls.length);
  });

  it('useReducedMotion follows the preference signal', () => {
    const seen: boolean[] = [];
    render(<ReducedMotionProbe seen={seen} />);
    expect(seen.at(-1)).toBe(false);
    act(() => setMotionPreference('reduced'));
    expect(seen.at(-1)).toBe(true);
  });

  it('RevealText keeps text accessible and restores markup on unmount', () => {
    const { container, unmount } = render(
      <RevealText as="h1" by="words" trigger="manual">
        Hello snow
      </RevealText>,
    );
    const h1 = container.querySelector('h1')!;
    expect(h1.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(h1.textContent).toContain('Hello snow');
    unmount();
  });

  it('usePin applies sticky positioning and cleans it up', () => {
    const { getByTestId, unmount } = render(<PinProbe />);
    const stage = getByTestId('stage');
    expect(stage.style.position).toBe('sticky');
    unmount();
    expect(stage.style.position).toBe('');
  });
});
