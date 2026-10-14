import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { wait } from './simulate';

/**
 * `React.lazy` that retries a failed chunk download. On a 2G connection a request
 * for a code-split step can simply drop; trying again a moment later usually works.
 * If every attempt fails, the error reaches the nearest `LoadErrorBoundary`.
 */
export function lazyWithRetry<T extends ComponentType>(
  load: () => Promise<{ default: T }>,
  { retries = 2, delayMs = 700 }: { retries?: number; delayMs?: number } = {},
): LazyExoticComponent<T> {
  const attempt = (remaining: number): Promise<{ default: T }> => load().catch(async (error) => {
    if (remaining <= 0) throw error;
    await wait(delayMs);
    return attempt(remaining - 1);
  });
  return lazy(() => attempt(retries));
}
