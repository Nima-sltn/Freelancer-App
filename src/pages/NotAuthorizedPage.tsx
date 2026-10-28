import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useUser } from "@/features/auth";
import { ROLE_HOME } from "@/config/constants";
import { useT } from "@/store/i18n";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

/** Shown when a signed-in user opens a route belonging to another role. */
function NotAuthorizedPage() {
  const { t } = useT();
  const { user } = useUser();
  useDocumentTitle(t("error.notAuthorized"));

  return (
    <main className="grid min-h-screen place-items-center bg-canvas p-6">
      <Card className="w-full max-w-lg p-8 text-center">
        <span aria-hidden="true" className="text-4xl">
          🚫
        </span>
        <h1 className="mt-4 text-xl font-black text-ink">{t("error.notAuthorized")}</h1>
        <p className="mt-3 text-sm leading-7 text-ink-muted">{t("error.notAuthorizedHint")}</p>

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Button to="/">{t("error.goHome")}</Button>
          {user ? (
            <Button variant="outline" to={ROLE_HOME[user.role]}>
              {t("error.goToDashboard")}
            </Button>
          ) : (
            <Button variant="outline" to="/auth">
              {t("landing.ctaPrimary")}
            </Button>
          )}
        </div>
      </Card>
    </main>
  );
}

export default NotAuthorizedPage;
