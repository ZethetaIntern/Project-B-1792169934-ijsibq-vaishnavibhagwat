import {
  afterEach, describe, expect, it,
} from 'vitest';
import { endSpan, startSpan } from './userTiming';

afterEach(() => performance.clearMeasures());

describe('user timing spans', () => {
  it('records a named measure and returns its duration', () => {
    startSpan('test:span');
    const duration = endSpan('test:span');
    expect(duration).toBeGreaterThanOrEqual(0);
    expect(performance.getEntriesByName('test:span', 'measure')).toHaveLength(1);
    expect(performance.getEntriesByName('test:span:start', 'mark')).toHaveLength(0);
  });

  it('returns null instead of throwing when the span never started', () => {
    expect(endSpan('test:never-started')).toBeNull();
  });
});
