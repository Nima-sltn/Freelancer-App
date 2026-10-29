export function truncate(text: string, max = 60, suffix = "…"): string {
  const value = (text ?? "").trim();
  if (value.length <= max) return value;
  return value.slice(0, Math.max(0, max - suffix.length)).trimEnd() + suffix;
}

export function initials(name: string): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "؟";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return `${parts[0][0]}${parts[1][0]}`;
}

/** Deterministic pastel colour derived from a name/id — avatars without images. */
export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 62% 46%)`;
}

const ARABIC_TO_PERSIAN: Array<[RegExp, string]> = [
  [/[يى]/g, "ی"],
  [/ك/g, "ک"],
  [/ة/g, "ه"],
  [/ۀ/g, "ه"],
  [/ؤ/g, "و"],
  [/[إأآ]/g, "ا"],
];

/**
 * Normalises Persian/Arabic text for search: unifies letter forms, strips
 * diacritics and ZWNJ, converts digits to Latin and lowercases.
 */
export function normalizeSearch(value: string): string {
  let out = (value ?? "").toLowerCase();
  ARABIC_TO_PERSIAN.forEach(([pattern, replacement]) => {
    out = out.replace(pattern, replacement);
  });
  return out
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
    .replace(/[\u200c\u200e\u200f]/g, " ")
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/\s+/g, " ")
    .trim();
}

export function includesQuery(haystack: string, query: string): boolean {
  if (!query) return true;
  return normalizeSearch(haystack).includes(normalizeSearch(query));
}

/**
 * Compact subsequence matcher used by the command palette: rewards adjacent
 * characters and word-boundary hits so "np" ranks "New Proposal" highly.
 */
export function fuzzyScore(needle: string, haystack: string): number {
  const query = normalizeSearch(needle);
  const target = normalizeSearch(haystack);
  if (!query) return 1;
  if (target.includes(query)) return 1 - target.indexOf(query) / (target.length + 1);

  let score = 0;
  let queryIndex = 0;
  let lastMatch = -1;
  for (let i = 0; i < target.length && queryIndex < query.length; i += 1) {
    if (target[i] === query[queryIndex]) {
      const isBoundary = i === 0 || /[\s\-_/.]/.test(target[i - 1]);
      if (isBoundary) {
        score += 6;
      } else if (lastMatch === i - 1) {
        score += 4;
      } else {
        score += 2;
      }
      lastMatch = i;
      queryIndex += 1;
    }
  }
  if (queryIndex < query.length) return 0;
  return score / (query.length * 6 + 4);
}

export interface HighlightSegment {
  text: string;
  match: boolean;
}

/** Splits text around a query so the palette can bold the matched spans. */
export function highlightMatches(text: string, query: string): HighlightSegment[] {
  if (!query) return [{ text, match: false }];
  const normalizedText = normalizeSearch(text);
  const normalizedQuery = normalizeSearch(query);
  const index = normalizedText.indexOf(normalizedQuery);
  if (index === -1) return [{ text, match: false }];
  return [
    { text: text.slice(0, index), match: false },
    { text: text.slice(index, index + query.length), match: true },
    { text: text.slice(index + query.length), match: false },
  ].filter((segment) => segment.text.length > 0);
}

export function slugify(value: string): string {
  return normalizeSearch(value)
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

export function titleCase(value: string): string {
  return value
    .split(/([\s_-]+)/)
    .map((word) => (word.length > 1 ? word[0].toUpperCase() + word.slice(1) : word))
    .join("");
}
