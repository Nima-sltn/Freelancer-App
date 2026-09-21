import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

export default function useLocalStorageState<T>(
  key: string,
  initialState: T
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const storedValue = localStorage.getItem(key) || null;
    return storedValue ? (JSON.parse(storedValue) as T) : initialState;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [value, key]);

  return [value, setValue];
}
