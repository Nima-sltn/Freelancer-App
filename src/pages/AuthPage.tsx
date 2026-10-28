import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContainer, useUser } from "@/features/auth";
import { ROLE_HOME } from "@/config/constants";
import { useT } from "@/store/i18n";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { LanguageToggle, ThemeToggle } from "@/components/layout/HeaderControls";
import { Card } from "@/components/ui/Card";
import { APP_META } from "@/config/env";

/** Sign-in page. Redirects an already-authenticated visitor to their dashboard. */
function AuthPage() {
  const { t } = useT();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useUser();
  useDocumentTitle(t("auth.title"));

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) return;
    if (!user.isActive) {
      navigate("/complete-profile", { replace: true });
      return;
    }
    navigate(ROLE_HOME[user.role], { replace: true });
  }, [isAuthenticated, isLoading, navigate, user]);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel — hidden on small screens to keep the form above the fold. */}
      <aside className="relative hidden overflow-hidden bg-primary-600 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -start-24 h-80 w-80 rounded-full bg-white/10 blur-3xl"
        />
        <Link to="/" className="relative flex items-center gap-2">
          <span
            aria-hidden="true"
            className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 text-sm font-black">
            FH
          </span>
          <span className="text-sm font-black">{APP_META.nameFa}</span>
        </Link>

        <div className="relative">
          <h2 className="text-3xl font-black leading-relaxed">{t("landing.heroTitle")}</h2>
          <p className="mt-4 max-w-md text-sm leading-8 text-white/85">{t("landing.heroSubtitle")}</p>

          <ul className="mt-8 space-y-3 text-sm">
            {["match", "escrow", "trust", "analytics"].map((key) => (
              <li key={key} className="flex items-center gap-3">
                <span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full bg-white/15">
                  ✓
                </span>
                {t(`landing.feature.${key}.title`)}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/70">{t("landing.footerRights")}</p>
      </aside>

      {/* Form panel */}
      <main className="relative flex items-center justify-center bg-canvas p-6">
        <div className="absolute end-4 top-4 flex items-center gap-1">
          <LanguageToggle />
          <ThemeToggle />
        </div>

        <Card className="w-full max-w-md p-6 sm:p-8">
          <AuthContainer />
        </Card>
      </main>
    </div>
  );
}

export default AuthPage;
