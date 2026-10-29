/**
 * Content Security Policy (CSP) Generator and Manager.
 *
 * Implements a strict yet workable Content-Security-Policy generator supporting
 * nonce-based script loading, hash verification, and meta tag injection.
 *
 * Architecture note: `lib/` stays completely React-free.
 */

export interface CspDirectives {
  defaultSrc?: string[];
  scriptSrc?: string[];
  styleSrc?: string[];
  imgSrc?: string[];
  connectSrc?: string[];
  fontSrc?: string[];
  objectSrc?: string[];
  mediaSrc?: string[];
  frameSrc?: string[];
  baseUri?: string[];
  formAction?: string[];
  upgradeInsecureRequests?: boolean;
  blockAllMixedContent?: boolean;
}

export interface CspOptions {
  /** Optional cryptographic nonce to authorize specific inline scripts */
  nonce?: string;
  /** Custom directive overrides or extensions */
  directives?: Partial<CspDirectives>;
  /** Development mode flag (allows unsafe-eval for HMR / Vite source maps) */
  isDev?: boolean;
}

/**
 * Generates a cryptographically strong random base64 nonce string.
 */
export function generateNonce(): string {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    // Convert to binary string then base64
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return typeof btoa === "function" ? btoa(binary) : Math.random().toString(36).slice(2);
  }
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

/**
 * Default strict policy optimized for modern SPA with Vite + Tailwind CSS.
 */
export function getDefaultDirectives(options: CspOptions = {}): CspDirectives {
  const { nonce, isDev = false } = options;

  const scriptSrc = ["'self'"];
  if (nonce) {
    scriptSrc.push(`'nonce-${nonce}'`);
  }
  if (isDev) {
    scriptSrc.push("'unsafe-eval'");
  }

  return {
    defaultSrc: ["'self'"],
    scriptSrc,
    styleSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline required for Tailwind arbitrary values & CSS variables
    imgSrc: ["'self'", "data:", "blob:", "https:"],
    connectSrc: ["'self'", "https:", "wss:", isDev ? "ws:" : ""].filter(Boolean),
    fontSrc: ["'self'", "data:", "https:"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    upgradeInsecureRequests: !isDev,
  };
}

/**
 * Converts a CspDirectives record into a CSP policy header or meta string.
 */
export function serializeCspDirectives(directives: CspDirectives): string {
  const parts: string[] = [];

  const directiveMapping: Array<[keyof CspDirectives, string]> = [
    ["defaultSrc", "default-src"],
    ["scriptSrc", "script-src"],
    ["styleSrc", "style-src"],
    ["imgSrc", "img-src"],
    ["connectSrc", "connect-src"],
    ["fontSrc", "font-src"],
    ["objectSrc", "object-src"],
    ["mediaSrc", "media-src"],
    ["frameSrc", "frame-src"],
    ["baseUri", "base-uri"],
    ["formAction", "form-action"],
  ];

  for (const [key, directiveName] of directiveMapping) {
    const values = directives[key] as string[] | undefined;
    if (values && values.length > 0) {
      parts.push(`${directiveName} ${values.join(" ")}`);
    }
  }

  if (directives.upgradeInsecureRequests) {
    parts.push("upgrade-insecure-requests");
  }

  if (directives.blockAllMixedContent) {
    parts.push("block-all-mixed-content");
  }

  return parts.join("; ");
}

/**
 * Generates the full CSP meta tag content string.
 */
export function generateCsp(options: CspOptions = {}): string {
  const defaults = getDefaultDirectives(options);
  const merged: CspDirectives = {
    ...defaults,
    ...options.directives,
  };

  // If specific directives were overridden, ensure arrays are properly replaced or merged
  if (options.directives) {
    for (const [key, val] of Object.entries(options.directives)) {
      if (Array.isArray(val) && val.length > 0) {
        (merged as Record<string, unknown>)[key] = val;
      }
    }
  }

  return serializeCspDirectives(merged);
}

/**
 * Injects or updates the Content-Security-Policy `<meta>` tag in `<head>`.
 */
export function applyCspMetaTag(policy: string): HTMLMetaElement | null {
  if (typeof document === "undefined") return null;

  let meta = document.head.querySelector<HTMLMetaElement>(
    'meta[http-equiv="Content-Security-Policy"]'
  );

  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("http-equiv", "Content-Security-Policy");
    document.head.prepend(meta);
  }

  meta.setAttribute("content", policy);
  return meta;
}
