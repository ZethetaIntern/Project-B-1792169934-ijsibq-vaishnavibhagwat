import { render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import {
  describe, expect, it, vi,
} from 'vitest';
import { LoadErrorBoundary } from '../components/common/LoadErrorBoundary';
import { lazyWithRetry } from './lazyWithRetry';

function Loaded() {
  return <p>Step loaded</p>;
}

function renderLazy(load: () => Promise<{ default: typeof Loaded }>) {
  const Step = lazyWithRetry(load, { retries: 2, delayMs: 10 });
  return render(
    <LoadErrorBoundary title="This step did not load">
      <Suspense fallback={<p>Loading…</p>}>
        <Step />
      </Suspense>
    </LoadErrorBoundary>,
  );
}

describe('lazyWithRetry', () => {
  it('retries a dropped chunk request and then renders the step', async () => {
    const load = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch dynamically imported module'))
      .mockResolvedValue({ default: Loaded });
    renderLazy(load);
    expect(await screen.findByText('Step loaded')).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('shows a reload prompt when every attempt fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const load = vi.fn().mockRejectedValue(new TypeError('Failed to fetch dynamically imported module'));
    renderLazy(load);
    expect(await screen.findByRole('alert')).toHaveTextContent('This step did not load');
    expect(screen.getByRole('button', { name: 'Reload the page' })).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(3);
  });
});
