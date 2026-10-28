import { describe, expect, it } from "vitest";

/**
 * Documentation conformance.
 *
 * The README is the project's front door, and it had grown a table of links to
 * five documents that did not exist — a small rot that quietly undermines every
 * claim on the page. This suite resolves every relative link in the Markdown
 * tree and fails the build when a target disappears, so docs can be trusted to
 * describe something that is really there.
 *
 * It also checks the inverse direction for the entry points: `README.md` must
 * link the documents a newcomer needs (architecture, ACID, features, API,
 * testing, decisions), because a doc nobody links is a doc nobody reads.
 */

type RawFiles = Record<string, string>;

const globbed = import.meta.glob(
  [
    "/README.md",
    "/CHANGELOG.md",
    "/CONTRIBUTING.md",
    "/LICENSE",
    "/docs/*.md",
    "/src/**/*.{ts,tsx,css}",
    "/public/**/*.{js,html,svg,css}",
    "/index.html",
    "/package.json",
    "/vite.config.js",
    "/tailwind.config.js",
    "/postcss.config.js",
  ],
  { query: "?raw", import: "default", eager: true }
) as RawFiles;

const FILES: RawFiles = Object.fromEntries(
  Object.entries(globbed).map(([key, value]) => [key.replace(/^\//, ""), value])
);

const MARKDOWN = Object.keys(FILES).filter((file) => file.endsWith(".md"));

function dirname(file: string): string {
  const index = file.lastIndexOf("/");
  return index < 0 ? "" : file.slice(0, index);
}

function resolveLink(from: string, target: string): string {
  const clean = target.split("#")[0].split("?")[0];
  if (!clean) return from; // pure anchor
  const base = dirname(from);
  const parts = (clean.startsWith("/") ? clean.slice(1) : `${base}/${clean}`).split("/");
  const out: string[] = [];
  parts.forEach((part) => {
    if (!part || part === ".") return;
    if (part === "..") out.pop();
    else out.push(part);
  });
  return out.join("/");
}

interface Link {
  from: string;
  target: string;
  line: number;
}

function linksIn(file: string): Link[] {
  const source = FILES[file] ?? "";
  const links: Link[] = [];
  const pattern = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    const target = match[1];
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    links.push({ from: file, target, line: source.slice(0, match.index).split("\n").length });
  }
  return links;
}

describe("documentation links", () => {
  it("found the documentation tree (the extractor is not matching nothing)", () => {
    expect(MARKDOWN.length).toBeGreaterThanOrEqual(7);
    expect(FILES["README.md"]).toBeTruthy();
  });

  it("resolves every relative link in the Markdown tree", () => {
    const dead = MARKDOWN.flatMap((file) =>
      linksIn(file)
        .filter((link) => !(resolveLink(file, link.target) in FILES))
        .map((link) => `${link.from}:${link.line} → ${link.target}`)
    );

    expect(dead).toEqual([]);
  });

  it("keeps the README's document index in step with docs/", () => {
    const readme = FILES["README.md"] ?? "";
    const required = [
      "docs/ARCHITECTURE.md",
      "docs/ACID.md",
      "docs/CROSS_DOMAIN.md",
      "docs/FEATURES.md",
      "docs/API.md",
      "docs/TESTING.md",
      "docs/DECISIONS.md",
      "CHANGELOG.md",
    ];

    const unlinked = required.filter((doc) => !readme.includes(doc));
    expect(unlinked).toEqual([]);
  });

  it("documents every file in docs/", () => {
    const readme = FILES["README.md"] ?? "";
    const undocumented = MARKDOWN.filter(
      (file) => file.startsWith("docs/") && !readme.includes(file)
    );
    expect(undocumented).toEqual([]);
  });
});
