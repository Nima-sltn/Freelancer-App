import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Avatar } from "@/components/ui/Avatar";
import { env } from "@/config/env";
import { DEMO_ACCOUNTS } from "@/mocks/data";
import { useT } from "@/store/i18n";
import { useDemoLogin } from "./useDemoLogin";

/**
 * Seeded demo accounts, rendered only in demo mode.
 *
 * Reviewers can explore all three role experiences (plus the "awaiting approval"
 * state) in one click, which is the difference between an app that demos well and
 * one that needs a backend, a database and an SMS gateway before it shows
 * anything at all.
 */
export function DemoAccounts() {
  const { t } = useT();
  const { loginAs, isPending, activePhone } = useDemoLogin();

  if (!env.useMocks) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs font-bold text-ink-muted">{t("auth.demoTitle")}</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {DEMO_ACCOUNTS.map((account) => (
          <Button
            key={account.phoneNumber}
            variant="outline"
            isLoading={isPending && activePhone === account.phoneNumber}
            leadingIcon={<Avatar name={t(account.labelKey)} size="xs" />}
            onClick={() => loginAs(account.phoneNumber)}
            className="justify-start">
            <span className="truncate text-xs">{t(account.labelKey)}</span>
          </Button>
        ))}
      </div>

      <Callout tone="warning">
        {t("auth.demoHint")} {t("auth.demoCodeNotice")}
      </Callout>
    </div>
  );
}

export default DemoAccounts;
