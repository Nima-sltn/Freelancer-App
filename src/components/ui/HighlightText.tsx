import { useMemo } from "react";
import { highlightMatches, fuzzySearch } from "@/lib/search";
import { cx } from "@/lib/cx";

export interface HighlightTextProps {
  text: string;
  indices?: [number, number][];
  query?: string;
  className?: string;
  highlightClassName?: string;
}

/**
 * Highlights matched substrings or fuzzy intervals using accessible <mark> tags.
 */
export function HighlightText({
  text,
  indices,
  query,
  className,
  highlightClassName,
}: HighlightTextProps) {
  const segments = useMemo(() => {
    if (indices && indices.length > 0) {
      return highlightMatches(text, indices);
    }
    if (query && query.trim()) {
      const results = fuzzySearch([{ text }], query, ["text"]);
      const computedIndices = results[0]?.matches[0]?.indices ?? [];
      return highlightMatches(text, computedIndices);
    }
    return [{ text, highlighted: false }];
  }, [text, indices, query]);

  return (
    <span className={className}>
      {segments.map((segment, index) =>
        segment.highlighted ? (
          <mark
            key={index}
            className={cx(
              "rounded-sm bg-primary-500/20 px-0.5 font-semibold text-primary-900 dark:bg-primary-400/25 dark:text-primary-100",
              highlightClassName
            )}>
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        )
      )}
    </span>
  );
}

export default HighlightText;
