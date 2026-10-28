import { describe, expect, it } from "vitest";

/**
 * Architecture conformance.
 *
 * `docs/ARCHITECTURE.md` states a dependency rule ("imports only point
 * downwards", "lib and entities never import React", "features never import
 * each other's internals"). A rule that lives only in prose decays within a few
 * commits, so this suite reads every source file and fails the build when the
 * graph stops matching the document — the architecture is *checked*, not
 * merely described.
 *
 * Rules, mirroring §1 of that document:
 *
 *  1. imports point strictly downwards through six layers;
 *  2. `lib/**` and `entities/**` are React- and UI-free;
 *  3. features are isolated from each other (one documented aggregator: `dashboard`);
 *  4. the HTTP client is reachable only from `services` and its own transport;
 *  5. cross-folder imports use the `@/` alias;
 *  6. every `@/` import resolves to a real file;
 *  7. the import graph contains no cycles.
 *
 * Sources are read through Vite's raw glob rather than `node:fs`, so the suite
 * runs in the same jsdom environment as every other test.
 */

type RawFiles = Record<string, string>;

const FILES: RawFiles = import.meta.glob("/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as RawFiles;

/** Vite glob keys look like `/src/lib/cx.ts`; work with project-relative paths. */
const SOURCES: RawFiles = Object.fromEntries(
  Object.entries(FILES).map(([key, value]) => [key.replace(/^\//, ""), value])
);

/* --------------------------------------------------------------- path maths */

function dirname(file: string): string {
  const index = file.lastIndexOf("/");
  return index < 0 ? "" : file.slice(0, index);
}

function normalize(input: string): string {
  const parts: string[] = [];
  input.split("/").forEach((segment) => {
    if (!segment || segment === ".") return;
    if (segment === "..") parts.pop();
    else parts.push(segment);
  });
  return parts.join("/");
}

/** Resolves a specifier to a project path, or `null` for package imports. */
function resolveSpecifier(fromFile: string, specifier: string): string | null {
  let base: string;
  if (specifier.startsWith("@/")) base = normalize(`src/${specifier.slice(2)}`);
  else if (specifier.startsWith(".")) base = normalize(`${dirname(fromFile)}/${specifier}`);
  else return null;

  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`];
  return candidates.find((candidate) => candidate in SOURCES) ?? null;
}

function topLevel(file: string): string {
  return file.split("/")[1] ?? file;
}

/* ------------------------------------------------------------------ parsing */

interface ParsedImport {
  specifier: string;
  /** Line number, so a failure tells you where to look. */
  line: number;
  typeOnly: boolean;
}

function importsOf(file: string): ParsedImport[] {
  const raw = SOURCES[file] ?? "";
  // Drop comments so prose that mentions `from "@/x"` is not mistaken for code.
  const source = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  const patterns = [
    /\bfrom\s+["']([^"']+)["']/g,
    /\bimport\s+["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];

  const results: ParsedImport[] = [];
  const seen = new Set<string>();

  patterns.forEach((pattern) => {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) {
      const specifier = match[1];
      if (!specifier) continue;
      const line = source.slice(0, match.index).split("\n").length;
      const key = `${line}:${specifier}`;
      if (seen.has(key)) continue;
      seen.add(key);
      // `import type X from "…"` / `export type { X } from "…"` vanish at
      // compile time and therefore cannot form a runtime cycle.
      const before = source.slice(Math.max(0, match.index - 120), match.index);
      results.push({ specifier, line, typeOnly: /\b(import|export)\s+type\b[^;]*$/.test(before) });
    }
  });

  return results;
}

/**
 * Layer ranks — higher may import lower, never the other way round.
 * (TypeScript would not catch an upward import: it compiles fine, it just
 * couples the layers that were deliberately kept apart.)
 */
const LAYERS: Record<string, number> = {
  types: 0,
  config: 1,
  lib: 1,
  entities: 2,
  services: 2,
  mocks: 2,
  store: 3,
  hooks: 3,
  components: 4,
  features: 5,
  pages: 6,
  app: 6,
};

function layerOf(file: string): number {
  const group = topLevel(file);
  if (group === "main.tsx") return 6;
  return LAYERS[group] ?? 0;
}

const RECORDS = Object.keys(SOURCES)
  // The rules describe production code; tests may import anything to build a fixture.
  .filter((file) => !file.startsWith("src/test/") && !/\.(test|spec)\./.test(file))
  .sort()
  .map((file) => ({ file, rel: file, imports: importsOf(file) }));

/* -------------------------------------------------------------------- rules */

describe("rule 1 — imports point downwards", () => {
  it("never reaches a layer above its own", () => {
    const violations: string[] = [];

    RECORDS.forEach(({ file, rel, imports }) => {
      const from = layerOf(file);
      imports.forEach((entry) => {
        const target = resolveSpecifier(file, entry.specifier);
        if (!target) return;
        const to = layerOf(target);
        if (to > from) {
          violations.push(
            `${rel}:${entry.line} → ${entry.specifier} (layer ${to} imported by layer ${from})`
          );
        }
      });
    });

    expect(violations).toEqual([]);
  });
});

describe("rule 2 — lib and entities stay pure", () => {
  it("import no React, no UI and no state container", () => {
    const forbidden = [
      "react",
      "react-dom",
      "react-router-dom",
      "@headlessui/react",
      "@tanstack/react-query",
      "react-hot-toast",
      "@/components",
      "@/store",
      "@/features",
      "@/pages",
      "@/app",
      "@/hooks",
    ];
    const violations: string[] = [];

    RECORDS.forEach(({ rel, imports }) => {
      if (!/^(src\/)?(entities|lib)\//.test(rel)) return;
      imports.forEach((entry) => {
        if (
          forbidden.some((bad) => entry.specifier === bad || entry.specifier.startsWith(`${bad}/`))
        ) {
          violations.push(`${rel}:${entry.line} → ${entry.specifier}`);
        }
      });
    });

    expect(violations).toEqual([]);
  });
});

describe("rule 3 — features are isolated from each other", () => {
  it("lets only the dashboard aggregator read across features", () => {
    const violations: string[] = [];

    RECORDS.forEach(({ rel, imports }) => {
      const match = /^src\/features\/([^/]+)\//.exec(rel);
      if (!match) return;
      const own = match[1];
      imports.forEach((entry) => {
        const other = /^@\/features\/([^/]+)\//.exec(entry.specifier);
        if (!other || other[1] === own) return;
        // `features/dashboard` exists to aggregate the read models of the other
        // features into one screen; nothing else may reach sideways.
        if (own !== "dashboard") violations.push(`${rel}:${entry.line} → ${entry.specifier}`);
      });
    });

    expect(violations).toEqual([]);
  });

  it("keeps the presentational layer below the feature layer", () => {
    const violations: string[] = [];

    RECORDS.forEach(({ rel, imports }) => {
      if (!/^src\/components\//.test(rel)) return;
      imports.forEach((entry) => {
        if (entry.specifier.startsWith("@/features") || entry.specifier.startsWith("@/pages")) {
          violations.push(`${rel}:${entry.line} → ${entry.specifier}`);
        }
      });
    });

    expect(violations).toEqual([]);
  });
});

describe("rule 4 — the HTTP client is a services concern", () => {
  it("is imported only by services, its transport, the shell and the entry point", () => {
    const allowed = /^src\/(services|lib|mocks|app)\//;
    const violations: string[] = [];

    RECORDS.forEach(({ rel, imports }) => {
      imports.forEach((entry) => {
        if (entry.specifier !== "@/lib/http" && !entry.specifier.startsWith("@/lib/http/")) return;
        // `lib/http/errors` is a pure error shape usable anywhere; the client is not.
        if (entry.specifier.endsWith("/errors")) return;
        if (allowed.test(rel) || rel === "src/main.tsx") return;
        violations.push(`${rel}:${entry.line} → ${entry.specifier}`);
      });
    });

    expect(violations).toEqual([]);
  });
});

describe("rule 5 — cross-folder imports use the @/ alias", () => {
  it("never climbs out of its own top-level folder with ../", () => {
    const violations: string[] = [];

    RECORDS.forEach(({ file, imports }) => {
      imports.forEach((entry) => {
        if (!entry.specifier.startsWith(".")) return;
        const target = resolveSpecifier(file, entry.specifier);
        if (!target) return;
        if (dirname(file) === dirname(target)) return; // sibling import
        if (topLevel(file) !== topLevel(target)) {
          violations.push(`${file} → ${entry.specifier}`);
        }
      });
    });

    expect(violations).toEqual([]);
  });
});

describe("rule 6 — every @/ import resolves", () => {
  it("points at a file that exists", () => {
    const missing: string[] = [];

    RECORDS.forEach(({ file, imports }) => {
      imports.forEach((entry) => {
        if (!entry.specifier.startsWith("@/")) return;
        if (!resolveSpecifier(file, entry.specifier)) {
          missing.push(`${file} → ${entry.specifier}`);
        }
      });
    });

    expect(missing).toEqual([]);
  });
});

describe("rule 7 — the import graph is acyclic", () => {
  it("has no circular imports", () => {
    const graph = new Map<string, Array<{ target: string; typeOnly: boolean }>>();
    RECORDS.forEach(({ file, imports }) => {
      const unique = new Map<string, boolean>();
      imports.forEach((entry) => {
        const target = resolveSpecifier(file, entry.specifier);
        if (!target) return;
        const known = unique.get(target);
        unique.set(target, known === undefined ? entry.typeOnly : known && entry.typeOnly);
      });
      graph.set(
        file,
        [...unique.entries()].map(([target, typeOnly]) => ({ target, typeOnly }))
      );
    });

    const WHITE = 0;
    const GREY = 1;
    const BLACK = 2;
    const colour = new Map<string, number>();
    RECORDS.forEach(({ file }) => colour.set(file, WHITE));
    const cycles: string[][] = [];

    const visit = (node: string, stack: string[]) => {
      colour.set(node, GREY);
      for (const edge of graph.get(node) ?? []) {
        if (edge.typeOnly) continue;
        const state = colour.get(edge.target) ?? WHITE;
        if (state === GREY) cycles.push([...stack, edge.target]);
        else if (state === WHITE) visit(edge.target, [...stack, edge.target]);
      }
      colour.set(node, BLACK);
    };

    RECORDS.forEach(({ file }) => {
      if (colour.get(file) === WHITE) visit(file, [file]);
    });

    expect(cycles).toEqual([]);
  });
});

it("covers the whole source tree (a rule nobody runs proves nothing)", () => {
  expect(RECORDS.length).toBeGreaterThan(150);
  expect(RECORDS.filter((record) => record.imports.length > 0).length).toBeGreaterThan(120);
});
