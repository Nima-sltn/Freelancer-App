import { describe, expect, it } from "vitest";
import {
  avatarColor,
  fuzzyScore,
  highlightMatches,
  includesQuery,
  initials,
  normalizeSearch,
  slugify,
  titleCase,
  truncate,
} from "./text";

describe("normalizeSearch", () => {
  it("unifies Arabic letter forms with Persian", () => {
    expect(normalizeSearch("يك")).toBe("یک");
    expect(normalizeSearch("ة")).toBe("ه");
  });

  it("strips diacritics, ZWNJ and zero-width marks", () => {
    expect(normalizeSearch("فریلنس\u200cر")).toBe("فریلنس ر");
    expect(normalizeSearch("سَلام")).toBe("سلام");
  });

  it("converts Persian and Arabic digits to Latin", () => {
    expect(normalizeSearch("۱۲۳")).toBe("123");
    expect(normalizeSearch("٤٥٦")).toBe("456");
  });

  it("collapses whitespace and lowercases", () => {
    expect(normalizeSearch("  Web   DESIGN  ")).toBe("web design");
  });
});

describe("includesQuery", () => {
  it("matches across digit and letter-form variants", () => {
    expect(includesQuery("پروژه شماره ۱۲۳", "123")).toBe(true);
    expect(includesQuery("Programming with ك", "programming with ک")).toBe(true);
  });

  it("treats an empty query as a match", () => {
    expect(includesQuery("anything", "")).toBe(true);
  });

  it("rejects unrelated haystacks", () => {
    expect(includesQuery("طراحی سایت", "موبایل")).toBe(false);
  });
});

describe("fuzzyScore", () => {
  it("scores exact substrings above subsequence matches", () => {
    expect(fuzzyScore("web", "Web Design")).toBeGreaterThan(fuzzyScore("wb", "Web Design"));
  });

  it("returns 0 when the query cannot be matched in order", () => {
    expect(fuzzyScore("xyz", "Web Design")).toBe(0);
  });

  it("returns 1 for an empty query", () => {
    expect(fuzzyScore("", "anything")).toBe(1);
  });

  it("ranks matching entries above an unrelated one in a palette list", () => {
    const options = ["New Project", "New Proposal", "Zebra Settings"];
    const ranked = options
      .map((option) => ({ option, score: fuzzyScore("npr", option) }))
      .sort((a, b) => b.score - a.score);
    expect(ranked[0].score).toBeGreaterThan(0);
    expect(ranked[1].score).toBeGreaterThan(0);
    expect(ranked[2]).toEqual({ option: "Zebra Settings", score: 0 });
  });
});

describe("highlightMatches", () => {
  it("splits the text around the matched span", () => {
    expect(highlightMatches("New Proposal", "Prop")).toEqual([
      { text: "New ", match: false },
      { text: "Prop", match: true },
      { text: "osal", match: false },
    ]);
  });

  it("returns one unmatched segment when there is no hit", () => {
    expect(highlightMatches("New Proposal", "zzz")).toEqual([
      { text: "New Proposal", match: false },
    ]);
  });
});

describe("presentational helpers", () => {
  it("truncates long text with an ellipsis", () => {
    expect(truncate("abcdefghij", 5)).toBe("abcd…");
    expect(truncate("abc", 5)).toBe("abc");
  });

  it("derives initials for avatars", () => {
    expect(initials("نیما سلطانی")).toBe("نس");
    expect(initials("Cher")).toBe("Ch");
    expect(initials("   ")).toBe("؟");
  });

  it("assigns a deterministic avatar colour", () => {
    expect(avatarColor("user-1")).toBe(avatarColor("user-1"));
    expect(avatarColor("user-1")).toMatch(/^hsl\(/);
  });

  it("slugifies and title-cases labels", () => {
    expect(slugify("Web Design!")).toBe("web-design");
    expect(titleCase("hello_world")).toBe("Hello_World");
  });
});
