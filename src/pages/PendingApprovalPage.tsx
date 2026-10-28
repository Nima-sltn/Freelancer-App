import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useUser, useLogout } from "@/features/auth";
import { useT } from "@/store/i18n";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { formatDigits } from "@/lib/format/numbers";

/**
 * Explains an unverified account.
 *
 * The old code silently bounced unverified users to the landing page with a
 * toast. A dedicated screen with the account status and the available actions is
 * both kinder and more accessible.
 */
function PendingApprovalPage() {
  const { t } = useT();
  const navigate = useNavigate();
  const { user, isLoading } = useUser();
  const { logout } = useLogout();
  useDocumentTitle(t("auth.pendingApproval"));

  useEffect(() => {
    if (isLoading) return;
    if (!user) navigate("/auth", { replace: true });
    else if (Number(user.status) === 2) navigate(`/${user.role.toLowerCase()}/dashboard`, { replace: true });
  }, [isLoading, navigate, user]);

  return (
    <main className="grid min-h-screen place-items-center bg-canvas p-6">
      <Card className="w-full max-w-lg p-8 text-center">
        <span aria-hidden="true" className="text-4xl">
          ⏳
        </span>
        <h1 className="mt-4 text-xl font-black text-ink">{t("auth.pendingApproval")}</h1>
        <p className="mt-3 text-sm leading-7 text-ink-muted">
          {t("profile.pendingNotice")}
        </p>

        {user ? (
          <dl className="mt-6 grid gap-2 text-start">
            <div className="flex items-center justify-between rounded-lg bg-surface-sunken px-3 py-2">
              <dt className="text-xs font-bold text-ink-soft">{t("field.name")}</dt>
              <dd className="text-xs font-black text-ink">{user.name}</dd>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-surface-sunken px-3 py-2">
              <dt className="text-xs font-bold text-ink-soft">{t("field.phone")}</dt>
              <dd className="text-xs font-black text-ink tabular-nums">
                {formatDigits(user.phoneNumber)}
              </dd>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-surface-sunken px-3 py-2">
              <dt className="text-xs font-bold text-ink-soft">{t("field.role")}</dt>
              <dd>
                <Badge tone="warning">{t(`role.${user.role}`)}</Badge>
              </dd>
            </div>
          </dl>
        ) : null}

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Button to="/" variant="outline">
            {t("error.goHome")}
          </Button>
          <Button variant="danger" onClick={logout}>
            {t("auth.logout")}
          </Button>
        </div>
      </Card>
    </main>
  );
}

export default PendingApprovalPage;
