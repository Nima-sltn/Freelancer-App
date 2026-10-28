import { useEffect } from "react";
import { APP_META } from "@/config/env";

/** Keeps the tab title in sync with the active route (a11y + SEO win). */
export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = `${title} · ${APP_META.nameFa}`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}

export default useDocumentTitle;
