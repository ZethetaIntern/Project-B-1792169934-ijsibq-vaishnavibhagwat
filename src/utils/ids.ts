/**
 * RFC 4122 version-4 UUID. `crypto.randomUUID` only exists from Chrome 92 and
 * Safari 15.4, so older supported browsers build one from `getRandomValues`
 * (available everywhere the app runs).
 */
export function createUuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  /* eslint-disable no-bitwise -- setting the UUID version and variant bits */
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  /* eslint-enable no-bitwise */
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
}
