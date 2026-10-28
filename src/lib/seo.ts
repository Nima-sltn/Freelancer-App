/**
 * SEO & Meta Management utilities.
 *
 * Directly manipulates `<head>` metadata (standard meta tags, Open Graph tags,
 * canonical link tags, and JSON-LD structured data) without external dependencies.
 *
 * Architecture note: `lib/` stays completely React-free.
 */

export interface PageMeta {
  title: string;
  description?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  ogUrl?: string;
  jsonLd?: Record<string, unknown>;
}

function setMetaTag(attrName: "name" | "property", attrValue: string, content?: string): void {
  if (typeof document === "undefined") return;

  const selector = `meta[${attrName}="${attrValue}"]`;
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;

  if (content === undefined || content === "") {
    if (el) el.remove();
    return;
  }

  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonicalLink(href?: string): void {
  if (typeof document === "undefined") return;

  let el = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;

  if (!href) {
    if (el) el.remove();
    return;
  }

  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function setJsonLdScript(data?: Record<string, unknown>): void {
  if (typeof document === "undefined") return;

  let el = document.getElementById("fh-json-ld") as HTMLScriptElement | null;

  if (!data || Object.keys(data).length === 0) {
    if (el) el.remove();
    return;
  }

  if (!el) {
    el = document.createElement("script");
    el.id = "fh-json-ld";
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data, null, 2);
}

/**
 * Builds a standardized Schema.org JSON-LD object.
 */
export function buildJsonLd(type: string, data: Record<string, unknown>): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": type,
    ...data,
  };
}

/**
 * Applies all metadata fields to the active document.
 */
export function applyPageMeta(meta: PageMeta): void {
  if (typeof document === "undefined") return;

  if (meta.title) {
    document.title = meta.title;
  }

  setMetaTag("name", "description", meta.description);
  setCanonicalLink(meta.canonical);

  // Open Graph
  setMetaTag("property", "og:title", meta.ogTitle ?? meta.title);
  setMetaTag("property", "og:description", meta.ogDescription ?? meta.description);
  setMetaTag("property", "og:image", meta.ogImage);
  setMetaTag("property", "og:type", meta.ogType ?? "website");
  setMetaTag("property", "og:url", meta.ogUrl ?? meta.canonical);

  // Twitter Cards
  setMetaTag("name", "twitter:card", meta.ogImage ? "summary_large_image" : "summary");
  setMetaTag("name", "twitter:title", meta.ogTitle ?? meta.title);
  setMetaTag("name", "twitter:description", meta.ogDescription ?? meta.description);
  if (meta.ogImage) {
    setMetaTag("name", "twitter:image", meta.ogImage);
  }

  // Structured Data
  setJsonLdScript(meta.jsonLd);
}

/**
 * Clears custom meta tags set by applyPageMeta.
 */
export function clearPageMeta(): void {
  if (typeof document === "undefined") return;

  const names = ["description", "twitter:card", "twitter:title", "twitter:description", "twitter:image"];
  const properties = ["og:title", "og:description", "og:image", "og:type", "og:url"];

  names.forEach((name) => {
    document.head.querySelector(`meta[name="${name}"]`)?.remove();
  });
  properties.forEach((prop) => {
    document.head.querySelector(`meta[property="${prop}"]`)?.remove();
  });
  document.head.querySelector('link[rel="canonical"]')?.remove();
  document.getElementById("fh-json-ld")?.remove();
}
