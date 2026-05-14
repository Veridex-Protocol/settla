'use client';

/**
 * Secure credential store for passkey credential metadata.
 *
 * Design goals:
 *  - Passkey *private keys* never leave the authenticator. What we store
 *    locally is non-secret metadata (credentialId, public key x/y, keyHash,
 *    derived addresses).
 *  - At rest, that metadata is opaque to anyone poking around DevTools.
 *  - Logout does NOT wipe the credential set. It only clears the
 *    "last active" pointer so the next login can re-bind.
 *  - The relayer / dashboard DB is the canonical source of truth. The local
 *    blob is an offline-resilient cache only.
 *
 * Implementation:
 *  - A non-extractable AES-GCM key is generated once per device and stored
 *    in IndexedDB (WebCrypto API). It survives logout. Plain localStorage
 *    only ever sees ciphertext under an opaque key.
 *  - One-shot migration moves legacy plaintext keys (`veridex_credentials`,
 *    `veridex_credential`, `sera_active_session`) into the encrypted blob,
 *    then deletes them.
 */

export interface StoredPasskeyCredential {
  credentialId: string;
  publicKeyX: string; // decimal string of bigint
  publicKeyY: string;
  keyHash: string;
  address?: string; // optional derived address (for display)
  label?: string;
}

export interface SecureCredentialBlob {
  version: 1;
  credentials: StoredPasskeyCredential[];
  lastActive?: {
    credentialId: string;
    address: string;
  };
  updatedAt: number;
}

const BLOB_KEY = '__stla__.v1';
const LEGACY_KEYS = ['veridex_credentials', 'veridex_credential', 'sera_active_session'];
const IDB_NAME = '__stla_keystore__';
const IDB_STORE = 'keys';
const IDB_KEY_ID = 'cred-key-v1';

let cachedKey: CryptoKey | null = null;
let migrationDone = false;

// ---------- IndexedDB helpers ----------

function openKeyDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadKeyFromIDB(): Promise<CryptoKey | null> {
  const db = await openKeyDB();
  return new Promise<CryptoKey | null>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const store = tx.objectStore(IDB_STORE);
    const req = store.get(IDB_KEY_ID);
    req.onsuccess = () => resolve((req.result as CryptoKey | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function saveKeyToIDB(key: CryptoKey): Promise<void> {
  const db = await openKeyDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    const req = store.put(key, IDB_KEY_ID);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Get (or lazily create) the device-local AES-GCM key.
 * The key is non-extractable to keep the contents opaque even if other
 * scripts on the page try to inspect IndexedDB.
 */
async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  const existing = await loadKeyFromIDB();
  if (existing) {
    cachedKey = existing;
    return existing;
  }

  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    /* extractable */ false,
    ['encrypt', 'decrypt'],
  );
  await saveKeyToIDB(key);
  cachedKey = key;
  return key;
}

// ---------- Encryption helpers ----------

function b64encode(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function encryptBlob(blob: SecureCredentialBlob): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(blob));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    plaintext as BufferSource,
  );
  // Envelope: v1.<iv b64>.<ct b64>
  return `v1.${b64encode(iv)}.${b64encode(new Uint8Array(ct))}`;
}

async function decryptBlob(envelope: string): Promise<SecureCredentialBlob | null> {
  try {
    const parts = envelope.split('.');
    if (parts.length !== 3 || parts[0] !== 'v1') return null;
    const iv = b64decode(parts[1]);
    const ct = b64decode(parts[2]);
    const key = await getKey();
    const pt = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      ct as BufferSource,
    );
    const json = new TextDecoder().decode(pt);
    return JSON.parse(json) as SecureCredentialBlob;
  } catch {
    return null;
  }
}

// ---------- Legacy migration ----------

function readLegacyCredentials(): StoredPasskeyCredential[] {
  const out: StoredPasskeyCredential[] = [];
  const seen = new Set<string>();

  for (const key of ['veridex_credentials', 'veridex_credential']) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      for (const c of arr) {
        if (
          c &&
          typeof c.credentialId === 'string' &&
          typeof c.publicKeyX === 'string' &&
          typeof c.publicKeyY === 'string' &&
          typeof c.keyHash === 'string' &&
          !seen.has(c.credentialId)
        ) {
          seen.add(c.credentialId);
          out.push({
            credentialId: c.credentialId,
            publicKeyX: c.publicKeyX,
            publicKeyY: c.publicKeyY,
            keyHash: c.keyHash,
            address: c.address,
            label: c.label,
          });
        }
      }
    } catch {
      /* ignore */
    }
  }
  return out;
}

function readLegacyActive(): SecureCredentialBlob['lastActive'] | undefined {
  try {
    const raw = localStorage.getItem('sera_active_session');
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    if (parsed?.credentialId && parsed?.address) {
      return { credentialId: parsed.credentialId, address: parsed.address };
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

async function migrateLegacyIfNeeded(): Promise<void> {
  if (migrationDone) return;
  migrationDone = true;
  if (typeof window === 'undefined') return;

  const existing = localStorage.getItem(BLOB_KEY);
  const legacyCreds = readLegacyCredentials();
  const legacyActive = readLegacyActive();

  if (!existing && (legacyCreds.length > 0 || legacyActive)) {
    const blob: SecureCredentialBlob = {
      version: 1,
      credentials: legacyCreds,
      lastActive: legacyActive,
      updatedAt: Date.now(),
    };
    try {
      const ct = await encryptBlob(blob);
      localStorage.setItem(BLOB_KEY, ct);
    } catch (e) {
      console.warn('[secure-credential-store] migration failed', e);
      return;
    }
  }

  // Always drop legacy plaintext keys once we've attempted migration.
  for (const k of LEGACY_KEYS) localStorage.removeItem(k);
}

// ---------- Public API ----------

export async function loadCredentialBlob(): Promise<SecureCredentialBlob> {
  if (typeof window === 'undefined') {
    return { version: 1, credentials: [], updatedAt: 0 };
  }
  await migrateLegacyIfNeeded();

  const raw = localStorage.getItem(BLOB_KEY);
  if (!raw) return { version: 1, credentials: [], updatedAt: 0 };

  const decrypted = await decryptBlob(raw);
  if (!decrypted) {
    // Corrupt blob — drop it so the user can recover via server.
    localStorage.removeItem(BLOB_KEY);
    return { version: 1, credentials: [], updatedAt: 0 };
  }
  return decrypted;
}

export async function saveCredentialBlob(blob: SecureCredentialBlob): Promise<void> {
  if (typeof window === 'undefined') return;
  blob.updatedAt = Date.now();
  const ct = await encryptBlob(blob);
  localStorage.setItem(BLOB_KEY, ct);
}

/**
 * Upsert one or more credentials into the encrypted blob.
 * De-duplicates by credentialId.
 */
export async function upsertCredentials(
  creds: StoredPasskeyCredential[],
): Promise<SecureCredentialBlob> {
  const blob = await loadCredentialBlob();
  const byId = new Map(blob.credentials.map((c) => [c.credentialId, c]));
  for (const c of creds) byId.set(c.credentialId, { ...byId.get(c.credentialId), ...c });
  blob.credentials = Array.from(byId.values());
  await saveCredentialBlob(blob);
  return blob;
}

/**
 * Set the active credential pointer. This is what gets cleared on logout —
 * the actual credentials remain encrypted at rest so the user can log back
 * in without re-registering.
 */
export async function setActiveCredential(info: {
  credentialId: string;
  address: string;
}): Promise<void> {
  const blob = await loadCredentialBlob();
  blob.lastActive = info;
  await saveCredentialBlob(blob);
}

export async function getActiveCredential(): Promise<
  SecureCredentialBlob['lastActive'] | null
> {
  const blob = await loadCredentialBlob();
  return blob.lastActive ?? null;
}

/**
 * Soft logout: clear only the "last active" pointer. Credentials remain
 * encrypted in storage so the next login can re-bind without re-registering
 * a passkey.
 */
export async function clearActiveCredential(): Promise<void> {
  const blob = await loadCredentialBlob();
  if (!blob.lastActive) return;
  blob.lastActive = undefined;
  await saveCredentialBlob(blob);
}

/**
 * Hard wipe: drop the entire credential set AND the device key. Use this
 * only when the user explicitly asks to "forget this device".
 */
export async function wipeAllCredentials(): Promise<void> {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(BLOB_KEY);
  for (const k of LEGACY_KEYS) localStorage.removeItem(k);
  cachedKey = null;
  try {
    const db = await openKeyDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const req = tx.objectStore(IDB_STORE).delete(IDB_KEY_ID);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    /* ignore */
  }
}

export async function hasAnyCredential(): Promise<boolean> {
  const blob = await loadCredentialBlob();
  return blob.credentials.length > 0;
}

/**
 * Synchronous best-effort check used during initial render before the async
 * blob load completes. Returns true if either an encrypted blob OR a legacy
 * plaintext credential entry exists. False negatives are acceptable here;
 * the async path will correct the UI shortly after.
 */
export function hasAnyCredentialSync(): boolean {
  if (typeof window === 'undefined') return false;
  if (localStorage.getItem(BLOB_KEY)) return true;
  for (const k of ['veridex_credentials', 'veridex_credential']) {
    if (localStorage.getItem(k)) return true;
  }
  return false;
}
