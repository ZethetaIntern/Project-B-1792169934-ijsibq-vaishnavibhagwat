// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  base64ToBytes, bytesToBase64, decryptString, encryptString,
} from './encryption';

const CONTEXT = 'lendswift_draft_home';
const SECRET = JSON.stringify({ pan: 'ABCPE1234F', aadhaar: '234567890124', income: 95_000 });

describe('AES-256-GCM draft encryption', () => {
  it('round-trips a JSON payload', async () => {
    const sealed = await encryptString(SECRET, CONTEXT);
    expect(sealed.startsWith('v1.')).toBe(true);
    expect(sealed).not.toContain('ABCPE1234F');
    await expect(decryptString(sealed, CONTEXT)).resolves.toBe(SECRET);
  });

  it('uses a fresh IV every time', async () => {
    const first = await encryptString(SECRET, CONTEXT);
    const second = await encryptString(SECRET, CONTEXT);
    expect(first).not.toBe(second);
  });

  it('detects tampering through the authentication tag', async () => {
    const sealed = await encryptString(SECRET, CONTEXT);
    const bytes = base64ToBytes(sealed.slice(3));
    bytes[bytes.length - 5] = (bytes[bytes.length - 5] + 1) % 256;
    await expect(decryptString(`v1.${bytesToBase64(bytes)}`, CONTEXT)).rejects.toThrow();
  });

  it('refuses ciphertext moved to a different storage key', async () => {
    const sealed = await encryptString(SECRET, CONTEXT);
    await expect(decryptString(sealed, 'lendswift_draft_personal')).rejects.toThrow();
  });

  it('rejects unknown formats', async () => {
    await expect(decryptString('not-encrypted', CONTEXT)).rejects.toThrow(/Unsupported/);
  });

  it('handles payloads larger than the base64 chunk size', async () => {
    const large = 'x'.repeat(200_000);
    const sealed = await encryptString(large, CONTEXT);
    await expect(decryptString(sealed, CONTEXT)).resolves.toHaveLength(200_000);
  });
});
