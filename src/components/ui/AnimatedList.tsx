import type { ReactNode } from "react";
import { AnimatedTransition, type TransitionVariant } from "./AnimatedTransition";
import { cx } from "@/lib/cx";

export interface AnimatedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor?: (item: T, index: number) => string | number;
  staggerMs?: number;
  variant?: TransitionVariant;
  className?: string;
  itemClassName?: string;
  as?: "ul" | "ol" | "div";
}

/**
 * Accessible list container that renders items with staggered entrance animations.
 */
export function AnimatedList<T>({
  items,
  renderItem,
  keyExtractor,
  staggerMs = 40,
  variant = "slide-up",
  className,
  itemClassName,
  as = "ul",
}: AnimatedListProps<T>) {
  const Container = as;

  return (
    <Container className={cx("space-y-2", className)}>
      {items.map((item, index) => {
        const key = keyExtractor ? keyExtractor(item, index) : index;
        const delay = Math.min(index * staggerMs, 400);

        return (
          <AnimatedTransition
            key={key}
            variant={variant}
            delay={delay}
            className={itemClassName}>
            {renderItem(item, index)}
          </AnimatedTransition>
        );
      })}
    </Container>
  );
}

export default AnimatedList;
