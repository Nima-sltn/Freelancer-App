/**
 * Namespaced, fail-safe persistence layer.
 *
 * Safari private mode, disabled storage and quota errors all throw on the raw
 * `localStorage` API. The product must never crash because persistence is
 * unavailable, so every access is guarded and falls back to an in-memory map.
 * The same object is used by the theme, i18n, notification and ACID journal
 * stores so a single `clearAll()` resets the app.
 */

const NAMESPACE = "fh.";

const memory = new Map<string, string>();

function canUseLocalStorage(): boolean {
  try {
    const probe = `${NAMESPACE}__probe__`;
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

const hasLocalStorage = typeof window !== "undefined" && canUseLocalStorage();

function rawGet(key: string): string | null {
  if (hasLocalStorage) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memory.get(key) ?? null;
    }
  }
  return memory.get(key) ?? null;
}

function rawSet(key: string, value: string): void {
  if (hasLocalStorage) {
    try {
      window.localStorage.setItem(key, value);
      return;
    } catch {
      memory.set(key, value);
      return;
    }
  }
  memory.set(key, value);
}

function rawRemove(key: string): void {
  if (hasLocalStorage) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* fall through to memory */
    }
  }
  memory.delete(key);
}

function namespaced(key: string): string {
  return `${NAMESPACE}${key}`;
}

export const storage = {
  /** Reads and JSON-parses a value, returning `fallback` on any failure. */
  get<T>(key: string, fallback: T): T {
    const raw = rawGet(namespaced(key));
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      rawSet(namespaced(key), JSON.stringify(value));
    } catch {
      /* serialisation failures must never break rendering */
    }
  },

  remove(key: string): void {
    rawRemove(namespaced(key));
  },

  /** Every app-owned key currently persisted. */
  keys(): string[] {
    if (!hasLocalStorage) return [...memory.keys()].map((k) => k.replace(NAMESPACE, ""));
    try {
      return Object.keys(window.localStorage)
        .filter((key) => key.startsWith(NAMESPACE))
        .map((key) => key.replace(NAMESPACE, ""));
    } catch {
      return [];
    }
  },

  /** Wipes only this application's keys — leaves other apps on the origin intact. */
  clearAll(): void {
    this.keys().forEach((key) => rawRemove(namespaced(key)));
    memory.clear();
  },

  get available(): boolean {
    return hasLocalStorage;
  },
};

export default storage;
