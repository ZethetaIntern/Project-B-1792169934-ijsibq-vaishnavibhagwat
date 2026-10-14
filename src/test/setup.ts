import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/**
 * jsdom has no canvas. Give components a no-op 2D context so signature pads and
 * typed signatures can mount; tests that need real drawing mock it themselves.
 */
function fakeContext(): CanvasRenderingContext2D {
  const state: Record<PropertyKey, unknown> = {
    measureText: () => ({ width: 100 }),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
  };
  return new Proxy(state, {
    get: (target, key) => (key in target ? target[key] : () => undefined),
    set: (_target, key, value) => {
      state[key] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

// Some suites run in the Node environment, where there is no DOM at all.
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = (() => fakeContext()) as unknown as
    typeof HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,iVBORw0KGgo=';
}

afterEach(() => {
  cleanup();
});
