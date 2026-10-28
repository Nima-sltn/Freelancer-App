import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { storage } from "@/lib/storage";

/**
 * `useState` that survives reloads.
 *
 * Rebuilt on top of `@/lib/storage`, which tolerates disabled/private storage
 * and quota errors — the previous version threw at module scope in Safari
 * private mode and persisted on every render.
 */
export function useLocalStorageState<T>(
  key: string,
  initialState: T
): [T, Dispatch<SetStateAction<T>>, () => void] {
  const [value, setValue] = useState<T>(() => storage.get<T>(key, initialState));

  const update: Dispatch<SetStateAction<T>> = useCallback(
    (next) => {
      setValue((previous) => {
        const resolved =
          typeof next === "function" ? (next as (current: T) => T)(previous) : next;
        storage.set(key, resolved);
        return resolved;
      });
    },
    [key]
  );

  const reset = useCallback(() => {
    storage.remove(key);
    setValue(initialState);
    // `initialState` is intentionally captured once; callers pass stable defaults.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return useMemo(() => [value, update, reset], [value, update, reset]);
}

export default useLocalStorageState;
