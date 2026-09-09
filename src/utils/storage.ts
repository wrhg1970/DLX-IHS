/**
 * Unified Safe Storage Utility
 * Prevents QuotaExceededError in localStorage by stripping large base64/blobs,
 * automatically pruning bloated cache entries, and gracefully failing without
 * crashing React components.
 */

export function cleanLocalStorageReplacer(key: string, value: any): any {
  if (typeof value === 'string') {
    // Strip large base64 or data URLs from localStorage
    if (
      key === 'fileData' ||
      key === 'attachmentData' ||
      key === 'base64' ||
      key === 'fileContent' ||
      key === 'dataUrl' ||
      key === 'invoicePdfUrl' ||
      key === 'invoiceXmlUrl' ||
      key === 'receiptUrl'
    ) {
      if (value.length > 500 && value.startsWith('data:')) {
        return '';
      }
    }

    if (value.length > 2000 && value.startsWith('data:')) {
      return '';
    }
  }
  return value;
}

/**
 * Scans all keys in localStorage and removes/cleans oversized items and base64 bloat.
 */
export function pruneLocalStorageBloat(): number {
  if (typeof window === 'undefined' || !window.localStorage) return 0;

  let totalFreedChars = 0;

  try {
    const keys = Object.keys(localStorage);
    
    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;

        // If the item has base64 data URLs or is over 100KB, attempt to clean it
        if (raw.includes('data:') || raw.includes('fileData') || raw.length > 100000) {
          try {
            const parsed = JSON.parse(raw);
            const cleanedStr = JSON.stringify(parsed, cleanLocalStorageReplacer);
            if (cleanedStr.length < raw.length) {
              const diff = raw.length - cleanedStr.length;
              localStorage.setItem(key, cleanedStr);
              totalFreedChars += diff;
              console.info(`[Storage Self-Healing] Cleaned ${diff} chars from "${key}"`);
            }
          } catch {
            // Not JSON, continue
          }
        }
      } catch (err) {
        console.warn(`[Storage Self-Healing] Error inspecting key "${key}":`, err);
      }
    }

    // If still tight, prune non-critical history/log keys if they are large
    const candidateLogKeys = [
      'crm_email_logs_v1',
      'email_delivery_log_',
      'activities',
      'last_auto_backup_time'
    ];

    for (const logKey of candidateLogKeys) {
      try {
        const raw = localStorage.getItem(logKey);
        if (raw && raw.length > 200000) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 30) {
            const truncated = parsed.slice(0, 30);
            const str = JSON.stringify(truncated, cleanLocalStorageReplacer);
            localStorage.setItem(logKey, str);
            totalFreedChars += (raw.length - str.length);
          }
        }
      } catch {
        // ignore
      }
    }
  } catch (globalErr) {
    console.warn('[Storage Self-Healing] Error during storage pruning:', globalErr);
  }

  return totalFreedChars;
}

/**
 * Safely saves a key/value pair to localStorage.
 * Automatically strips huge base64 strings and handles QuotaExceededError defensively.
 */
export function safeLocalStorageSet(key: string, value: any): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;

  try {
    const stringified = typeof value === 'string' ? value : JSON.stringify(value, cleanLocalStorageReplacer);
    localStorage.setItem(key, stringified);
    return true;
  } catch (firstErr: any) {
    const isQuotaError = 
      firstErr?.name === 'QuotaExceededError' ||
      firstErr?.code === 22 ||
      firstErr?.code === 1014 ||
      (typeof firstErr?.message === 'string' && firstErr.message.toLowerCase().includes('quota'));

    if (isQuotaError) {
      console.warn(`[Storage Quota Exceeded] Triggering storage cleanup for "${key}"...`);
      const freed = pruneLocalStorageBloat();
      console.warn(`[Storage Quota Exceeded] Freed ~${freed} characters. Retrying setItem for "${key}"...`);

      try {
        const stringified = typeof value === 'string' ? value : JSON.stringify(value, cleanLocalStorageReplacer);
        localStorage.setItem(key, stringified);
        return true;
      } catch (secondErr) {
        // If still failing, try emergency compression if it's an array
        if (Array.isArray(value)) {
          try {
            // Trim to essential properties or fewer items
            const slimmed = value.slice(0, 100);
            const stringifiedSlim = JSON.stringify(slimmed, cleanLocalStorageReplacer);
            localStorage.setItem(key, stringifiedSlim);
            console.warn(`[Storage Quota Exceeded] Saved slimmed array for "${key}".`);
            return true;
          } catch {
            // Fall through to graceful failure
          }
        }

        console.error(`[Storage Quota Limit] Could not save "${key}" to localStorage. Memory state preserved.`, secondErr);
        return false;
      }
    } else {
      console.error(`[Storage Error] Could not save "${key}":`, firstErr);
      return false;
    }
  }
}

/**
 * Safely retrieves an item from localStorage.
 */
export function safeLocalStorageGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined' || !window.localStorage) return fallback;

  try {
    const item = localStorage.getItem(key);
    if (item === null || item === undefined) return fallback;
    return JSON.parse(item) as T;
  } catch {
    return fallback;
  }
}

/**
 * Safely removes an item from localStorage.
 */
export function safeLocalStorageRemove(key: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn(`[Storage Error] Could not remove key "${key}":`, e);
  }
}

// Automatically run a gentle self-healing check on initial script load
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    pruneLocalStorageBloat();
  } catch (e) {
    console.warn('[Storage Init] Non-blocking prune error:', e);
  }
}
