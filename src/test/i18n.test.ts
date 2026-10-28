import { describe, expect, it } from "vitest";
import { en, fa } from "@/store/i18n/translations";

/**
 * Translation completeness.
 *
 * `en` is a `Record<TranslationKey, string>`, so *English* coverage is enforced
 * by the compiler. Nothing enforced the other direction: `t()` falls back to the
 * raw key, so a typo or a removed string renders `users.verifyToast` on screen —
 * in Persian, to a Persian-speaking user, with no test failing.
 *
 * This suite scans the source for every statically-written key and checks it
 * against the Persian dictionary, which makes the silent failure mode loud.
 * Dynamically built keys (`t(\`tx.state.${state}\`)`) are intentionally out of
 * scope: they are covered by the exhaustive `switch`-style helpers they live
 * next to, and by hand.
 */

type RawFiles = Record<string, string>;

const SOURCES: RawFiles = Object.fromEntries(
  Object.entries(
    import.meta.glob("/src/**/*.{ts,tsx}", { query: "?raw", import: "default", eager: true }) as
      RawFiles
  ).map(([key, value]) => [key.replace(/^\//, ""), value])
);

/** Key-taking call sites: `t("…")`, `titleKey: "…"`, `labelKey`, `messageKey`, `bodyKey`. */
const PATTERNS = [
  /\bt\(\s*"([^"\n]+)"/g,
  /\b(?:titleKey|labelKey|messageKey|bodyKey|actionKey)\s*:\s*"([^"\n]+)"/g,
];

function usedKeys(): Map<string, string[]> {
  const found = new Map<string, string[]>();
  const skip = /^src\/(test|store\/i18n)\//;

  Object.entries(SOURCES).forEach(([file, source]) => {
    if (skip.test(file) || /\.(test|spec)\./.test(file)) return;
    const text = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

    PATTERNS.forEach((pattern) => {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(text)) !== null) {
        const key = match[1];
        const line = text.slice(0, match.index).split("\n").length;
        const sites = found.get(key) ?? [];
        sites.push(`${file}:${line}`);
        found.set(key, sites);
      }
    });
  });

  return found;
}

describe("i18n", () => {
  const used = usedKeys();

  it("found a meaningful number of statically written keys", () => {
    // Guards against the extractor silently matching nothing (a passing suite
    // that checks nothing is worse than no suite).
    expect(used.size).toBeGreaterThan(80);
  });

  it("resolves every statically written key in the Persian dictionary", () => {
    const missing = [...used.entries()]
      .filter(([key]) => !(key in fa))
      .map(([key, sites]) => `${key} (${sites[0]})`);

    expect(missing).toEqual([]);
  });

  it("keeps both dictionaries in step", () => {
    // The compiler already requires `en` to cover every `fa` key (it is typed
    // `Record<TranslationKey, string>`); this asserts the same in the other
    // direction and pins the scale of the dictionary so a mass deletion is
    // impossible to miss.
    const missingEnglish = Object.keys(fa).filter((key) => !(key in en));
    expect(missingEnglish).toEqual([]);
    expect(Object.keys(fa).length).toBeGreaterThan(500);
    expect(Object.keys(en).length).toBe(Object.keys(fa).length);
  });
});
