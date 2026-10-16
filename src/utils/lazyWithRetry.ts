import {
  createElement, lazy, useState, type ComponentType,
} from 'react';
import { wait } from './simulate';

/** A code-split screen (steps, the workspace): rendered without props. */
export type PreloadableComponent = ComponentType & {
  /** Starts (or reuses) the download. Never rejects; a failure surfaces on render. */
  preload: () => Promise<void>;
};

/**
 * `React.lazy` that retries a failed chunk download and can be preloaded.
 *
 * - On a 2G connection a request for a code-split step can simply drop; trying
 *   again a moment later usually works. If every attempt fails, the error reaches
 *   the nearest `LoadErrorBoundary`, and the next render or preload tries afresh.
 * - `preload()` fetches the code ahead of time. Once it has arrived the component
 *   renders directly: a plain `React.lazy` would still suspend once (its promise
 *   settles asynchronously), and React holds a Suspense boundary's content back for
 *   up to 300 ms after showing a fallback, which made every forward step take
 *   ~330 ms instead of the 200 ms budget.
 */
export function lazyWithRetry<T extends ComponentType>(
  load: () => Promise<{ default: T }>,
  { retries = 2, delayMs = 700 }: { retries?: number; delayMs?: number } = {},
): PreloadableComponent {
  const attempt = (remaining: number): Promise<{ default: T }> => load().catch(async (error) => {
    if (remaining <= 0) throw error;
    await wait(delayMs);
    return attempt(remaining - 1);
  });

  let loaded: T | null = null;
  let pending: Promise<{ default: T }> | null = null;
  const loadOnce = () => {
    pending ??= attempt(retries).then(
      (module) => {
        loaded = module.default;
        return module;
      },
      (error: unknown) => {
        pending = null;
        throw error;
      },
    );
    return pending;
  };
  const Lazy = lazy<ComponentType>(loadOnce);

  function Preloadable() {
    // Chosen once per mount, so a download finishing later never swaps the
    // element type (which would remount the step and lose its form state).
    const [chosen] = useState<{ type: ComponentType }>(() => ({ type: loaded ?? Lazy }));
    return createElement(chosen.type);
  }

  return Object.assign(Preloadable, {
    preload: () => loadOnce().then(() => undefined, () => undefined),
  });
}
