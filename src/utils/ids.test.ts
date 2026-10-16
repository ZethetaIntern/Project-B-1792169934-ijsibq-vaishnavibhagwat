import { describe, expect, it } from 'vitest';
import { createUuid } from './ids';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('createUuid', () => {
  it('uses crypto.randomUUID when the browser has it', () => {
    expect(createUuid()).toMatch(UUID_V4);
  });

  it('builds valid, unique version-4 UUIDs on browsers without randomUUID', () => {
    const original = crypto.randomUUID;
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
    try {
      const ids = new Set(Array.from({ length: 50 }, () => createUuid()));
      ids.forEach((id) => expect(id).toMatch(UUID_V4));
      expect(ids.size).toBe(50);
    } finally {
      Object.defineProperty(crypto, 'randomUUID', { value: original, configurable: true });
    }
  });
});
