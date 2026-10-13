/** LocalStorage key prefix: drafts live at `lendswift_draft_[loanType]`. */
export const DRAFT_KEY_PREFIX = 'lendswift_draft_';
/** Metadata is stored beside each draft at `<draft key>_meta`. */
export const DRAFT_META_SUFFIX = '_meta';
/** Bump when the saved shape changes; older drafts are then discarded, not mis-read. */
export const DRAFT_SCHEMA_VERSION = '1.0';
/** Drafts older than this are purged (data minimisation). */
export const DRAFT_TTL_MS = 72 * 60 * 60 * 1000;
/** Auto-save cadence. */
export const AUTOSAVE_INTERVAL_MS = 30_000;
/** "Draft saved" toast duration. */
export const AUTOSAVE_TOAST_MS = 2_000;
/** Sign the user out of the in-memory session after this much inactivity. */
export const SESSION_TIMEOUT_MS = 15 * 60 * 1000;
