import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Reactive, typed view over the URL query string.
 *
 * Filters, sorting, pagination and the active tab all live in the URL: the state
 * is shareable, survives reloads and works with browser back/forward — none of
 * which was true when filters lived in component state.
 */
export interface QueryParamsApi<T extends Record<string, string>> {
  values: T;
  get: (key: keyof T & string) => string;
  set: (patch: Partial<Record<keyof T & string, string | number | undefined>>) => void;
  remove: (key: keyof T & string) => void;
  reset: () => void;
  /** Number of parameters that differ from the defaults. */
  activeCount: number;
}

export function useQueryParams<T extends Record<string, string>>(
  defaults: T
): QueryParamsApi<T> {
  const [searchParams, setSearchParams] = useSearchParams();

  const values = useMemo(() => {
    const result = { ...defaults };
    (Object.keys(defaults) as Array<keyof T & string>).forEach((key) => {
      const fromUrl = searchParams.get(key);
      if (fromUrl !== null) result[key] = fromUrl as T[keyof T & string];
    });
    return result;
  }, [searchParams, defaults]);

  const set = useCallback<QueryParamsApi<T>["set"]>(
    (patch) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          Object.entries(patch).forEach(([key, value]) => {
            if (value === undefined || value === "" || value === null) {
              next.delete(key);
              return;
            }
            const strValue =
              typeof value === "string"
                ? value
                : typeof value === "number" || typeof value === "boolean"
                  ? `${value}`
                  : JSON.stringify(value);
            if (strValue === defaults[key]) {
              next.delete(key);
              return;
            }
            next.set(key, strValue);
          });
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams, defaults]
  );

  const remove = useCallback<QueryParamsApi<T>["remove"]>(
    (key) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.delete(key);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const reset = useCallback(() => setSearchParams({}, { replace: true }), [setSearchParams]);

  const activeCount = useMemo(
    () =>
      (Object.keys(defaults) as Array<keyof T & string>).filter(
        (key) => values[key] !== defaults[key]
      ).length,
    [values, defaults]
  );

  return {
    values,
    get: (key) => values[key] ?? "",
    set,
    remove,
    reset,
    activeCount,
  };
}

export default useQueryParams;
