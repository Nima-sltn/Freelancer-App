import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useMoveBack } from "@/hooks/useMoveBack";
import { useT } from "@/store/i18n";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

/** 404 with a working back affordance and a route home. */
function NotFoundPage() {
  const { t, locale } = useT();
  const moveBack = useMoveBack();
  useDocumentTitle(t("error.notFound"));

  return (
    <main className="grid min-h-screen place-items-center bg-canvas p-6">
      <Card className="w-full max-w-lg p-8 text-center">
        <p className="text-5xl font-black text-primary-600 tabular-nums">{locale === "fa" ? "۴۰۴" : "404"}</p>
        <h1 className="mt-4 text-xl font-black text-ink">{t("error.notFound")}</h1>
        <p className="mt-3 text-sm leading-7 text-ink-muted">{t("error.notFoundHint")}</p>

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Button onClick={moveBack} variant="outline">
            {t("common.back")}
          </Button>
          <Button to="/">{t("error.goHome")}</Button>
        </div>
      </Card>
    </main>
  );
}

export default NotFoundPage;
