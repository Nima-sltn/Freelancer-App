import { useEffect, useRef, type RefObject } from "react";

/**
 * Calls `handler` when a pointer lands outside the returned element.
 * Used by dropdowns and the command palette's backdrop.
 */
export function useOutsideClick<T extends HTMLElement = HTMLDivElement>(
  handler: () => void,
  enabled = true
): RefObject<T> {
  const ref = useRef<T>(null);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;
    const listener = (event: MouseEvent | TouchEvent) => {
      const element = ref.current;
      if (!element || element.contains(event.target as Node)) return;
      handlerRef.current();
    };
    document.addEventListener("mousedown", listener, true);
    document.addEventListener("touchstart", listener, true);
    return () => {
      document.removeEventListener("mousedown", listener, true);
      document.removeEventListener("touchstart", listener, true);
    };
  }, [enabled]);

  return ref;
}

export default useOutsideClick;
