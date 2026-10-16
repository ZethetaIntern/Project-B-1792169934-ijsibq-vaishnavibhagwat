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
/** Payload prefixes: which key derivation sealed the data. */
const FORMAT_VERSION = 'v1';
const DIGEST_FORMAT_VERSION = 'v1d';

/** Byte array backed by a plain ArrayBuffer (what Web Crypto accepts). */
type Bytes = Uint8Array<ArrayBuffer>;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

type KeyScheme = 'pbkdf2' | 'digest';

interface DerivedKey {
  key: CryptoKey;
  scheme: KeyScheme;
}

let keyPromise: Promise<DerivedKey> | null = null;

async function derivePbkdf2Key(): Promise<CryptoKey> {
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
}

/** SHA-256 of the same secret, for engines without PBKDF2 (some WebKit builds). */
async function deriveDigestKey(): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`${SALT}::${PASSPHRASE}`));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/**
 * Derives the AES-256-GCM key once per page load. PBKDF2 is preferred; where the
 * engine does not implement it, a SHA-256 digest of the same secret is used. The
 * fallback costs no real protection: the passphrase ships in the bundle either way.
 */
function getDerivedKey(): Promise<DerivedKey> {
  keyPromise ??= derivePbkdf2Key()
    .then((key): DerivedKey => ({ key, scheme: 'pbkdf2' }))
    .catch(async (): Promise<DerivedKey> => ({ key: await deriveDigestKey(), scheme: 'digest' }));
  return keyPromise;
}

export async function getEncryptionKey(): Promise<CryptoKey> {
  return (await getDerivedKey()).key;
}

/** Test helper: forget the cached key so the next call derives it again. */
export function resetEncryptionKey(): void {
  keyPromise = null;
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

/** "v1.<base64(iv ‖ ciphertext ‖ tag)>" ("v1d." when the digest-derived key was used). */
export async function encryptString(plain: string, context: string): Promise<string> {
  const sealed = await encryptBytes(encoder.encode(plain), context);
  const { scheme } = await getDerivedKey();
  return `${scheme === 'pbkdf2' ? FORMAT_VERSION : DIGEST_FORMAT_VERSION}.${bytesToBase64(sealed)}`;
}

export async function decryptString(payload: string, context: string): Promise<string> {
  const [version, body] = payload.split('.');
  const { scheme } = await getDerivedKey();
  const expected = scheme === 'pbkdf2' ? FORMAT_VERSION : DIGEST_FORMAT_VERSION;
  if (version !== expected || !body) throw new Error('Unsupported encrypted payload format');
  return decoder.decode(await decryptBytes(base64ToBytes(body), context));
}
