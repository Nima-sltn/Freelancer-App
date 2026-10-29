import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useTheme } from "@/store/theme";
import { cx } from "@/lib/cx";

export type TransitionVariant = "fade" | "slide-up" | "slide-left" | "scale" | "none";

export interface AnimatedTransitionProps {
  readonly children: ReactNode;
  readonly variant?: TransitionVariant;
  readonly duration?: number;
  readonly delay?: number;
  readonly className?: string;
  readonly show?: boolean;
  readonly unmountOnExit?: boolean;
}

function computeTransform(variant: TransitionVariant, isVisible: boolean): string | undefined {
  if (variant === "slide-up") return isVisible ? "translateY(0)" : "translateY(12px)";
  if (variant === "slide-left") return isVisible ? "translateX(0)" : "translateX(-12px)";
  if (variant === "scale") return isVisible ? "scale(1)" : "scale(0.96)";
  return undefined;
}

function useTransitionMount(show: boolean, unmountOnExit: boolean, duration: number) {
  const [mounted, setMounted] = useState(false);
  const [shouldRender, setShouldRender] = useState(show || !unmountOnExit);

  useEffect(() => {
    if (!show) {
      setMounted(false);
      if (!unmountOnExit) return;
      const timer = setTimeout(() => setShouldRender(false), duration);
      return () => clearTimeout(timer);
    }

    setShouldRender(true);
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, [show, unmountOnExit, duration]);

  return { mounted, shouldRender };
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
}: Readonly<AnimatedTransitionProps>) {
  const { reduceMotion } = useTheme();
  const { mounted, shouldRender } = useTransitionMount(show, unmountOnExit, duration);

  const isReduced =
    reduceMotion ||
    (typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

  if (unmountOnExit && !shouldRender) {
    return null;
  }

  if (isReduced || variant === "none") {
    return <div className={className}>{children}</div>;
  }

  const isVisible = show && mounted;
  const initialTransform = computeTransform(variant, isVisible);

  const style: CSSProperties = {
    opacity: isVisible ? 1 : 0,
    transform: initialTransform,
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
