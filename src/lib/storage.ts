const PREFIX = 'geoguess-rouen:';

/** Reads + JSON-parses a namespaced localStorage key, falling back on any error. */
export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

/** Writes a value as JSON; silently ignores unavailable storage / quota errors. */
export function saveJSON<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode, quota) — progress just won't persist */
  }
}
