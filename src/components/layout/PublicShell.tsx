import { Link, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { LanguageToggle, ThemeToggle } from "./HeaderControls";
import { useT } from "@/store/i18n";
import { APP_META } from "@/config/env";

/** Public shell for the landing page: spacious, refined, architectural header & footer. */
export function PublicShell() {
  const { t } = useT();

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink antialiased">
      <a
        href="#main-content"
        className="sr-only-focusable absolute start-4 top-4 z-50 rounded-xl bg-primary-600 px-4 py-2 text-sm font-bold text-white shadow-lg">
        {t("a11y.skipToContent")}
      </a>

      {/* Floating blur header */}
      <header className="sticky top-0 z-30 border-b border-line/60 bg-surface/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link to="/" className="group flex items-center gap-2.5 transition-opacity hover:opacity-90">
              <span
                aria-hidden="true"
                className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-tr from-primary-700 to-primary-500 text-sm font-black text-white shadow-sm shadow-primary-500/25">
                FH
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-black tracking-tight text-ink">{APP_META.nameFa}</span>
                <span className="text-[0.65rem] font-semibold text-ink-muted">FreelanceHub</span>
              </div>
            </Link>

            <nav aria-label={t("a11y.mainNav")} className="hidden items-center gap-1 sm:ms-4 md:flex">
              <a
                href="#features"
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink">
                {t("landing.featuresTitle")}
              </a>
              <a
                href="#how"
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink">
                {t("landing.howTitle")}
              </a>
              <a
                href="#roles"
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink">
                {t("landing.rolesTitle")}
              </a>
              <a
                href="#projects"
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink">
                {t("projects.listTitle")}
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-2.5">
            <LanguageToggle />
            <ThemeToggle />
            <Button
              size="sm"
              to="/auth"
              className="rounded-xl px-4 py-2 font-bold shadow-sm transition-all hover:shadow-md">
              {t("landing.ctaPrimary")}
            </Button>
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-1">
        <Outlet />
      </main>

      {/* Editorial Footer */}
      <footer className="border-t border-line/70 bg-surface/50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-600 text-xs font-black text-white">
                FH
              </span>
              <p className="text-xs text-ink-soft">
                {t("app.name")} · {t("app.taglineFull")}
              </p>
            </div>
            <div className="flex items-center gap-6 text-xs text-ink-muted">
              <span>{t("common.version")} {APP_META.version}</span>
              <span className="h-3 w-px bg-line" aria-hidden="true" />
              <span>{t("landing.footerRights")}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default PublicShell;
