import { useMemo } from "react";
import { highlightMatches, fuzzySearch } from "@/lib/search";
import { cx } from "@/lib/cx";

export interface HighlightTextProps {
  readonly text: string;
  readonly indices?: readonly [number, number][];
  readonly query?: string;
  readonly className?: string;
  readonly highlightClassName?: string;
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
}: Readonly<HighlightTextProps>) {
  const segments = useMemo(() => {
    let raw: Array<{ text: string; highlighted: boolean }>;
    if (indices && indices.length > 0) {
      raw = highlightMatches(text, indices as [number, number][]);
    } else if (query?.trim()) {
      const results = fuzzySearch([{ text }], query, ["text"]);
      const computedIndices = results[0]?.matches[0]?.indices ?? [];
      raw = highlightMatches(text, computedIndices);
    } else {
      raw = [{ text, highlighted: false }];
    }

    let offset = 0;
    return raw.map((segment) => {
      const key = `seg-${offset}`;
      offset += segment.text.length;
      return { ...segment, key };
    });
  }, [text, indices, query]);

  return (
    <span className={className}>
      {segments.map((segment) =>
        segment.highlighted ? (
          <mark
            key={segment.key}
            className={cx(
              "rounded-sm bg-primary-500/20 px-0.5 font-semibold text-primary-900 dark:bg-primary-400/25 dark:text-primary-100",
              highlightClassName
            )}>
            {segment.text}
          </mark>
        ) : (
          <span key={segment.key}>{segment.text}</span>
        )
      )}
    </span>
  );
}

export default HighlightText;
