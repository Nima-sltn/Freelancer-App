import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useTheme } from "@/store/theme";
import { cx } from "@/lib/cx";

export type TransitionVariant = "fade" | "slide-up" | "slide-left" | "scale" | "none";

export interface AnimatedTransitionProps {
  children: ReactNode;
  variant?: TransitionVariant;
  duration?: number;
  delay?: number;
  className?: string;
  show?: boolean;
  unmountOnExit?: boolean;
}

/**
 * Accessible CSS-driven transition container.
 * Smoothly animates children on mount/visibility changes while honoring
 * OS and user reduced-motion preferences.
 */
export function AnimatedTransition({
  children,
  variant = "slide-up",
  duration = 240,
  delay = 0,
  className,
  show = true,
  unmountOnExit = false,
}: AnimatedTransitionProps) {
  const { reduceMotion } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [shouldRender, setShouldRender] = useState(show || !unmountOnExit);

  const isReduced =
    reduceMotion ||
    (typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    if (show) {
      setShouldRender(true);
      const raf = requestAnimationFrame(() => {
        setMounted(true);
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setMounted(false);
      if (unmountOnExit) {
        const timer = setTimeout(() => {
          setShouldRender(false);
        }, duration);
        return () => clearTimeout(timer);
      }
    }
  }, [show, unmountOnExit, duration]);

  if (unmountOnExit && !shouldRender) {
    return null;
  }

  if (isReduced || variant === "none") {
    return <div className={className}>{children}</div>;
  }

  const isVisible = show && mounted;

  let initialTransform = "";
  if (variant === "slide-up") {
    initialTransform = isVisible ? "translateY(0)" : "translateY(12px)";
  } else if (variant === "slide-left") {
    initialTransform = isVisible ? "translateX(0)" : "translateX(-12px)";
  } else if (variant === "scale") {
    initialTransform = isVisible ? "scale(1)" : "scale(0.96)";
  }

  const style: CSSProperties = {
    opacity: isVisible ? 1 : 0,
    transform: initialTransform || undefined,
    transitionProperty: "opacity, transform",
    transitionDuration: `${duration}ms`,
    transitionDelay: `${delay}ms`,
    transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
    willChange: isVisible ? "auto" : "opacity, transform",
  };

  return (
    <div className={cx(className)} style={style}>
      {children}
    </div>
  );
}

export default AnimatedTransition;
