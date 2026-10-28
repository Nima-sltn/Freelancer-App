import { useEffect, useRef } from "react";
import { applyPageMeta, type PageMeta } from "@/lib/seo";
import { APP_META } from "@/config/env";

/**
 * Keeps document head metadata, Open Graph tags, canonical link,
 * and JSON-LD structured data in sync with the current page route.
 * Restores previous metadata upon unmount.
 */
export function usePageMeta(meta: PageMeta): void {
  const previousState = useRef<{
    title: string;
    description: string | null;
    canonical: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    ogImage: string | null;
    ogType: string | null;
    jsonLd: string | null;
  } | null>(null);

  useEffect(() => {
    // Capture snapshot of previous state before applying new metadata
    if (!previousState.current) {
      previousState.current = {
        title: document.title,
        description: document.head.querySelector('meta[name="description"]')?.getAttribute("content") ?? null,
        canonical: document.head.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null,
        ogTitle: document.head.querySelector('meta[property="og:title"]')?.getAttribute("content") ?? null,
        ogDescription:
          document.head.querySelector('meta[property="og:description"]')?.getAttribute("content") ?? null,
        ogImage: document.head.querySelector('meta[property="og:image"]')?.getAttribute("content") ?? null,
        ogType: document.head.querySelector('meta[property="og:type"]')?.getAttribute("content") ?? null,
        jsonLd: document.getElementById("fh-json-ld")?.textContent ?? null,
      };
    }

    const titleWithApp = meta.title.includes(APP_META.nameFa)
      ? meta.title
      : `${meta.title} · ${APP_META.nameFa}`;

    applyPageMeta({
      ...meta,
      title: titleWithApp,
      ogTitle: meta.ogTitle ?? titleWithApp,
    });

    return () => {
      if (previousState.current) {
        document.title = previousState.current.title;
        applyPageMeta({
          title: previousState.current.title,
          description: previousState.current.description ?? undefined,
          canonical: previousState.current.canonical ?? undefined,
          ogTitle: previousState.current.ogTitle ?? undefined,
          ogDescription: previousState.current.ogDescription ?? undefined,
          ogImage: previousState.current.ogImage ?? undefined,
          ogType: previousState.current.ogType ?? undefined,
          jsonLd: previousState.current.jsonLd ? JSON.parse(previousState.current.jsonLd) : undefined,
        });
      }
    };
  }, [
    meta.title,
    meta.description,
    meta.canonical,
    meta.ogTitle,
    meta.ogDescription,
    meta.ogImage,
    meta.ogType,
    meta.ogUrl,
    meta.jsonLd,
  ]);
}

export default usePageMeta;
