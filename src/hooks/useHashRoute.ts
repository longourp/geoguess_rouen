import { useSyncExternalStore } from 'react';

/**
 * Minimal hash-based routing ('#/astuce' → 'astuce', '' or '#/' → '').
 * GitHub Pages has no server-side rewrites, so hash routes are the only
 * option that survives a refresh without a 404.html fallback.
 */
export function parseHash(hash: string): string {
  return hash.replace(/^#\/?/, '').replace(/\/$/, '');
}

function subscribe(callback: () => void): () => void {
  window.addEventListener('hashchange', callback);
  return () => window.removeEventListener('hashchange', callback);
}

function getSnapshot(): string {
  return parseHash(window.location.hash);
}

export function useHashRoute(): string {
  return useSyncExternalStore(subscribe, getSnapshot, () => '');
}
