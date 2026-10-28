import { useEffect, useMemo, useRef, useState } from "react";

export interface VirtualListOptions {
  itemHeight: number;
  overscan?: number;
  /** Disable windowing entirely (small lists render faster directly). */
  enabled?: boolean;
}

export interface VirtualListResult {
  /** Slice bounds for the visible window. */
  start: number;
  end: number;
  /** Height of the spacer that keeps the scrollbar honest. */
  totalHeight: number;
  /** Vertical offset applied to the rendered slice. */
  offsetY: number;
  containerRef: React.RefObject<HTMLDivElement>;
  visibleCount: number;
}

/**
 * Minimal fixed-height windowing implementation (~50 lines, zero dependencies).
 *
 * The proposal and audit tables can grow to thousands of rows in the admin
 * console; rendering every row made scrolling janky. This keeps the DOM at
 * roughly one screenful regardless of dataset size.
 */
export function useVirtualList(
  itemCount: number,
  { itemHeight, overscan = 6, enabled = true }: VirtualListOptions
): VirtualListResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);

  const isActive = enabled && itemCount > 40;

  useEffect(() => {
    if (!isActive) return;
    const element = containerRef.current;
    if (!element) return;

    const handleScroll = () => setScrollTop(element.scrollTop);
    const measure = () => setViewportHeight(element.clientHeight || 600);

    measure();
    element.addEventListener("scroll", handleScroll, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      element.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  }, [isActive]);

  const { start, end } = useMemo(() => {
    if (!isActive) return { start: 0, end: itemCount };
    const first = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visible = Math.ceil(viewportHeight / itemHeight) + overscan * 2;
    return { start: first, end: Math.min(itemCount, first + visible) };
  }, [isActive, scrollTop, viewportHeight, itemHeight, overscan, itemCount]);

  return {
    start,
    end,
    totalHeight: isActive ? itemCount * itemHeight : 0,
    offsetY: isActive ? start * itemHeight : 0,
    containerRef,
    visibleCount: end - start,
  };
}

export default useVirtualList;
