import { useEffect, useRef, useState } from "react";
import { formatNumber, type NumberFormatOptions } from "@/lib/format/numbers";
import { useTheme } from "@/store/theme";

export interface AnimatedNumberProps {
  readonly value: number;
  readonly duration?: number;
  readonly formatOptions?: NumberFormatOptions;
  readonly formatter?: (val: number) => string;
  readonly className?: string;
  readonly easing?: (t: number) => number;
}

const defaultEaseOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Animated number counter that smoothly transitions between values
 * using requestAnimationFrame and locale-aware number formatting.
 */
export function AnimatedNumber({
  value,
  duration = 500,
  formatOptions,
  formatter,
  className,
  easing = defaultEaseOutCubic,
}: Readonly<AnimatedNumberProps>) {
  const { reduceMotion } = useTheme();
  const [displayValue, setDisplayValue] = useState(value);
  const previousValueRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  const isReduced =
    reduceMotion ||
    (typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    if (isReduced || duration <= 0) {
      setDisplayValue(value);
      previousValueRef.current = value;
      return;
    }

    const startValue = previousValueRef.current;
    const targetValue = value;
    const diff = targetValue - startValue;

    if (diff === 0) {
      setDisplayValue(value);
      return;
    }

    let startTime: number | null = null;

    const tick = (now: number) => {
      startTime ??= now;
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = easing(progress);

      const current = startValue + diff * eased;
      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayValue(targetValue);
        previousValueRef.current = targetValue;
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [value, duration, isReduced, easing]);

  const formatted = formatter
    ? formatter(Math.round(displayValue))
    : formatNumber(Math.round(displayValue), formatOptions);

  return <span className={className}>{formatted}</span>;
}

export default AnimatedNumber;
