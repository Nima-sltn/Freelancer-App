import { CompleteProfileForm } from "@/features/auth";
import { Card } from "@/components/ui/Card";
import { Callout } from "@/components/ui/Callout";
import { useT } from "@/store/i18n";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

/** Third sign-in step: gather the details a phone number cannot provide. */
function CompleteProfilePage() {
  const { t } = useT();
  useDocumentTitle(t("auth.completeProfile"));

  return (
    <main className="grid min-h-screen place-items-center bg-canvas p-6">
      <div className="w-full max-w-lg space-y-5">
        <header className="text-center">
          <h1 className="text-2xl font-black text-ink">{t("auth.completeProfile")}</h1>
          <p className="mt-2 text-sm leading-7 text-ink-muted">{t("auth.completeProfileHint")}</p>
        </header>

        <Card className="p-6">
          <CompleteProfileForm />
        </Card>

        <Callout tone="info">
          {t("profile.completeSubtitle")}
        </Callout>
      </div>
    </main>
  );
}

export default CompleteProfilePage;
