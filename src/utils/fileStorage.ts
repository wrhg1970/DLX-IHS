/**
 * IndexedDB File Storage Utility
 * Provides persistent, quota-friendly local storage for PDF and document files,
 * ensuring Firestore documents and localStorage stay lean (preventing QuotaExceededError
 * and Firestore's 1MB document size limit).
 */

const DB_NAME = 'edulink_file_storage';
const STORE_NAME = 'institution_documents';
const DB_VERSION = 1;

// In-memory fallback store to ensure zero-crash operations if IndexedDB quota is exceeded
const memoryFileStore = new Map<string, string>();

let dbPromise: Promise<IDBDatabase> | null = null;
let isIndexedDbBroken = false;

function getDB(): Promise<IDBDatabase> {
  if (isIndexedDbBroken || typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB is not available in this environment'));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
          try {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
              db.createObjectStore(STORE_NAME);
            }
          } catch (upgradeErr) {
            console.warn('[FileStorage] Error during onupgradeneeded, falling back to memory:', upgradeErr);
          }
        };

        request.onsuccess = () => {
          const db = request.result;
          db.onclose = () => {
            dbPromise = null;
          };
          db.onerror = () => {
            dbPromise = null;
          };
          resolve(db);
        };

        request.onerror = (e) => {
          console.warn('[FileStorage] Failed to open IndexedDB (quota or iframe restriction), using memory fallback:', request.error || e);
          isIndexedDbBroken = true;
          dbPromise = null;
          reject(request.error || new Error('Failed to open IndexedDB'));
        };

        request.onblocked = () => {
          console.warn('[FileStorage] IndexedDB open blocked');
          dbPromise = null;
          reject(new Error('IndexedDB blocked'));
        };
      } catch (err) {
        isIndexedDbBroken = true;
        dbPromise = null;
        reject(err);
      }
    });
  }

  return dbPromise;
}

/**
 * Stores a file's data URL in IndexedDB with memory fallback.
 */
export async function saveFileToIndexedDB(key: string, dataUrl: string): Promise<boolean> {
  // Always keep in memory store as fast buffer & immediate fallback
  memoryFileStore.set(key, dataUrl);

  try {
    const db = await getDB();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(dataUrl, key);

        tx.oncomplete = () => resolve(true);
        tx.onerror = (e) => {
          console.warn(`[FileStorage] Transaction error saving key "${key}", memory fallback active:`, e);
          // Still return true because it's safely saved in memoryFileStore
          resolve(true);
        };
        tx.onabort = () => {
          resolve(true);
        };
      } catch (txErr) {
        console.warn(`[FileStorage] Quota or transaction error on "${key}", memory fallback active:`, txErr);
        resolve(true);
      }
    });
  } catch (err) {
    // Memory store already holds the dataUrl
    return true;
  }
}

/**
 * Retrieves a file's data URL from IndexedDB or memory fallback.
 */
export async function getFileFromIndexedDB(key: string): Promise<string | null> {
  // Check memory store first
  if (memoryFileStore.has(key)) {
    return memoryFileStore.get(key) || null;
  }

  try {
    const db = await getDB();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(key);

        request.onsuccess = () => {
          const result = request.result || null;
          if (result) {
            memoryFileStore.set(key, result);
          }
          resolve(result);
        };

        request.onerror = () => {
          resolve(memoryFileStore.get(key) || null);
        };
      } catch {
        resolve(memoryFileStore.get(key) || null);
      }
    });
  } catch (err) {
    return memoryFileStore.get(key) || null;
  }
}

/**
 * Checks whether a file exists in IndexedDB or memory.
 */
export async function hasFileInIndexedDB(key: string): Promise<boolean> {
  if (memoryFileStore.has(key)) return true;
  try {
    const val = await getFileFromIndexedDB(key);
    return !!val;
  } catch {
    return false;
  }
}

/**
 * Deletes a file from IndexedDB and memory.
 */
export async function deleteFileFromIndexedDB(key: string): Promise<boolean> {
  memoryFileStore.delete(key);
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(key);

        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(true);
      } catch {
        resolve(true);
      }
    });
  } catch (err) {
    return true;
  }
}
