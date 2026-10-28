import { normalizeSearch } from "./format/text";

export interface SearchResult<T> {
  item: T;
  score: number;
  matches: Array<{ field: string; indices: [number, number][] }>;
}

/**
 * Builds a character index map from original string to normalized string.
 * This guarantees that slice ranges computed on normalized text map back to
 * exact character positions in the original text (even when Persian diacritics
 * or spaces were collapsed).
 */
function buildNormalizedCharMap(raw: string): { normalized: string; map: number[] } {
  const original = raw ?? "";
  const map: number[] = [];
  let normalized = "";

  // Process character by character
  for (let i = 0; i < original.length; i += 1) {
    const char = original[i];
    if (/\s/.test(char)) {
      map.push(i);
      normalized += " ";
      continue;
    }
    const norm = normalizeSearch(char);
    if (norm.length > 0) {
      for (let k = 0; k < norm.length; k += 1) {
        map.push(i);
        normalized += norm[k];
      }
    }
  }

  return { normalized, map };
}

/** Merges overlapping or adjacent index intervals. */
function mergeIntervals(intervals: [number, number][]): [number, number][] {
  if (intervals.length <= 1) return intervals;
  const sorted = [...intervals].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: [number, number][] = [sorted[0]];

  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    if (current[0] <= last[1]) {
      last[1] = Math.max(last[1], current[1]);
    } else {
      merged.push(current);
    }
  }

  return merged;
}

/**
 * Splits `text` into segments with `highlighted` flags based on the given match intervals.
 *
 * @param text The source text
 * @param indices Array of [start, end] ranges (start inclusive, end exclusive)
 */
export function highlightMatches(
  text: string,
  indices: [number, number][]
): Array<{ text: string; highlighted: boolean }> {
  if (!text) return [];
  if (!indices || indices.length === 0) {
    return [{ text, highlighted: false }];
  }

  const merged = mergeIntervals(indices);
  const segments: Array<{ text: string; highlighted: boolean }> = [];
  let cursor = 0;

  merged.forEach(([start, end]) => {
    const safeStart = Math.max(0, Math.min(start, text.length));
    const safeEnd = Math.max(safeStart, Math.min(end, text.length));

    if (safeStart > cursor) {
      segments.push({
        text: text.slice(cursor, safeStart),
        highlighted: false,
      });
    }

    if (safeEnd > safeStart) {
      segments.push({
        text: text.slice(safeStart, safeEnd),
        highlighted: true,
      });
    }

    cursor = safeEnd;
  });

  if (cursor < text.length) {
    segments.push({
      text: text.slice(cursor),
      highlighted: false,
    });
  }

  return segments.filter((s) => s.text.length > 0);
}

interface MatchCandidate {
  score: number;
  indices: [number, number][];
}

/**
 * Matches a query against a single text target, returning score and original-string intervals.
 */
function matchField(rawTarget: string, rawQuery: string): MatchCandidate | null {
  if (!rawTarget || !rawQuery) return null;

  const { normalized: target, map } = buildNormalizedCharMap(rawTarget);
  const query = normalizeSearch(rawQuery);

  if (!query || !target) return null;

  // 1. Exact substring match
  const exactIndex = target.indexOf(query);
  if (exactIndex !== -1) {
    const origStart = map[exactIndex] ?? 0;
    const origEnd = (map[exactIndex + query.length - 1] ?? origStart) + 1;
    // Score based on position (early match bonus) and query length ratio
    const positionBonus = 1 - exactIndex / (target.length + 1);
    const lengthRatio = query.length / target.length;
    const score = Math.min(1, 0.7 + 0.2 * positionBonus + 0.1 * lengthRatio);
    return {
      score,
      indices: [[origStart, origEnd]],
    };
  }

  // 2. Fuzzy subsequence match
  let score = 0;
  let queryIndex = 0;
  let lastTargetIndex = -1;
  const normIndices: [number, number][] = [];

  for (let i = 0; i < target.length && queryIndex < query.length; i += 1) {
    if (target[i] === query[queryIndex]) {
      const isWordBoundary = i === 0 || /[\s\-_/.]/.test(target[i - 1]);
      const isConsecutive = lastTargetIndex === i - 1;

      score += isWordBoundary ? 8 : isConsecutive ? 5 : 2;
      normIndices.push([i, i + 1]);
      lastTargetIndex = i;
      queryIndex += 1;
    }
  }

  // If not all query characters were found
  if (queryIndex < query.length) {
    return null;
  }

  // Map normalized indices to original character positions
  const origIntervals: [number, number][] = normIndices.map(([s, e]) => {
    const origStart = map[s] ?? s;
    const origEnd = (map[e - 1] ?? origStart) + 1;
    return [origStart, origEnd];
  });

  const maxPossibleScore = query.length * 8;
  const normalizedScore = Math.min(0.9, Math.max(0.1, score / (maxPossibleScore + 2)));

  return {
    score: normalizedScore,
    indices: mergeIntervals(origIntervals),
  };
}

/**
 * Fuzzy search across items with multi-field support and Persian/Arabic normalization.
 *
 * @param items List of objects to search through
 * @param query Search query
 * @param fields Array of keys in item to inspect
 * @returns Filtered and scored results ordered by descending score
 */
export function fuzzySearch<T>(
  items: T[],
  query: string,
  fields: (keyof T)[]
): SearchResult<T>[] {
  const trimmed = (query ?? "").trim();
  if (!trimmed) {
    return items.map((item) => ({
      item,
      score: 1,
      matches: [],
    }));
  }

  const results: SearchResult<T>[] = [];

  items.forEach((item) => {
    let bestScore = 0;
    const fieldMatches: Array<{ field: string; indices: [number, number][] }> = [];

    fields.forEach((field) => {
      const value = item[field];
      if (value === null || value === undefined) return;

      if (Array.isArray(value)) {
        // Handle array of strings (e.g. tags)
        value.forEach((v) => {
          if (typeof v === "string") {
            const candidate = matchField(v, trimmed);
            if (candidate && candidate.score > 0) {
              bestScore = Math.max(bestScore, candidate.score);
              fieldMatches.push({ field: String(field), indices: candidate.indices });
            }
          }
        });
      } else {
        const textValue = String(value);
        const candidate = matchField(textValue, trimmed);
        if (candidate && candidate.score > 0) {
          bestScore = Math.max(bestScore, candidate.score);
          fieldMatches.push({ field: String(field), indices: candidate.indices });
        }
      }
    });

    if (bestScore > 0) {
      results.push({
        item,
        score: Math.round(bestScore * 100) / 100,
        matches: fieldMatches,
      });
    }
  });

  return results.sort((a, b) => b.score - a.score);
}
