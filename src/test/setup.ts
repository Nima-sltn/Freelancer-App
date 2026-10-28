import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { storage } from "@/lib/storage";

/**
 * Global test environment.
 *
 * jsdom implements the DOM but not the handful of browser APIs the app shell
 * touches on mount (colour-scheme queries, virtualised lists, scroll helpers,
 * `crypto.randomUUID`). They are stubbed here once so individual tests never
 * have to care, and every test starts from an empty, deterministic storage.
 */

if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

class MockObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): [] {
    return [];
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
if (!("ResizeObserver" in globalThis)) {
  (globalThis as any).ResizeObserver = MockObserver;
}
if (!("IntersectionObserver" in globalThis)) {
  (globalThis as any).IntersectionObserver = MockObserver;
}
if (typeof window.scrollTo !== "function") {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
}
if (!globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: {
      ...(globalThis.crypto ?? {}),
      randomUUID: () => "00000000-0000-4000-8000-" + Math.random().toString(16).slice(2, 14),
    },
  });
}
/* eslint-enable @typescript-eslint/no-explicit-any */

beforeEach(() => {
  storage.clearAll();
});

afterEach(() => {
  cleanup();
  storage.clearAll();
});
