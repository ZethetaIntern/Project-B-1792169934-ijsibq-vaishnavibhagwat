/**
 * AES-256-GCM encryption for drafts saved on this device (Web Crypto API).
 *
 * Key management — read this before trusting it:
 * the key is derived (PBKDF2-SHA-256) from a passphrase that ships inside the app
 * bundle, as the brief allows for this project. That keeps PII unreadable to anyone
 * casually inspecting LocalStorage or a copied browser profile, and GCM's
 * authentication tag makes any tampering detectable. It does NOT protect against
 * code running on this origin (e.g. an XSS payload), which could derive the same
 * key. A production system would use a per-user key held by the server or a
 * non-extractable key in IndexedDB bound to an authenticated session.
 */

const PASSPHRASE = 'lendswift-demo::local-draft-encryption::v1';
const SALT = 'lendswift.draft.salt.v1';
const PBKDF2_ITERATIONS = 150_000;
const IV_BYTES = 12;
const FORMAT_VERSION = 'v1';

/** Byte array backed by a plain ArrayBuffer (what Web Crypto accepts). */
type Bytes = Uint8Array<ArrayBuffer>;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

let keyPromise: Promise<CryptoKey> | null = null;

/** Derives the AES-256-GCM key once per page load (PBKDF2 is deliberately slow). */
export function getEncryptionKey(): Promise<CryptoKey> {
  keyPromise ??= (async () => {
    const material = await crypto.subtle.importKey('raw', encoder.encode(PASSPHRASE), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2', salt: encoder.encode(SALT), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256',
      },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  })();
  return keyPromise;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000; // avoid call-stack limits on large payloads
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): Bytes {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

/**
 * Encrypts bytes. `context` is bound as GCM additional data: the ciphertext only
 * decrypts under the same context (e.g. its storage key), so drafts cannot be
 * swapped between keys unnoticed.
 */
export async function encryptBytes(plain: Bytes, context: string): Promise<Bytes> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode(context) },
    await getEncryptionKey(),
    plain,
  );
  const sealed = new Uint8Array(IV_BYTES + cipher.byteLength);
  sealed.set(iv, 0);
  sealed.set(new Uint8Array(cipher), IV_BYTES);
  return sealed;
}

/** Decrypts bytes from `encryptBytes`. Throws if the data or context was altered. */
export async function decryptBytes(sealed: Bytes, context: string): Promise<Bytes> {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: sealed.subarray(0, IV_BYTES), additionalData: encoder.encode(context) },
    await getEncryptionKey(),
    sealed.subarray(IV_BYTES),
  );
  return new Uint8Array(plain);
}

/** "v1.<base64(iv ‖ ciphertext ‖ tag)>" */
export async function encryptString(plain: string, context: string): Promise<string> {
  const sealed = await encryptBytes(encoder.encode(plain), context);
  return `${FORMAT_VERSION}.${bytesToBase64(sealed)}`;
}

export async function decryptString(payload: string, context: string): Promise<string> {
  const [version, body] = payload.split('.');
  if (version !== FORMAT_VERSION || !body) throw new Error('Unsupported encrypted payload format');
  return decoder.decode(await decryptBytes(base64ToBytes(body), context));
}
