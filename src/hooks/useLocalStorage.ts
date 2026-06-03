import { useCallback, useState } from 'react';
import { loadJSON, saveJSON } from '../lib/storage';

/** State that mirrors itself into localStorage. */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => loadJSON(key, initial));

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        saveJSON(key, resolved);
        return resolved;
      });
    },
    [key],
  );

  return [value, update] as const;
}
