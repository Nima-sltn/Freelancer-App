import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useTransactions } from "@/store/transaction";
import { useT } from "@/store/i18n";
import { env } from "@/config/env";
import { formatNumber } from "@/lib/format/numbers";

/**
 * Connectivity banner.
 *
 * Distinguishes two very different failure modes: the browser is offline, or the
 * browser is online but the API is unreachable (`degraded`). The latter is the
 * common local-development case, and telling the user "the server is not
 * responding" saves a lot of confusion. Offline writes are surfaced through the
 * transaction journal so the user knows their change is queued, not lost.
 */
export function OfflineBanner() {
  const { online, degraded } = useOnlineStatus();
  const { pendingCount } = useTransactions();
  const { t } = useT();

  if (online && !degraded) return null;

  const isOffline = !online;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center text-xs font-bold text-white ${
        isOffline ? "bg-warning" : "bg-danger"
      }`}>
      <span aria-hidden="true">{isOffline ? "📴" : "🛑"}</span>
      <span>{isOffline ? t("offline.title") : t("offline.degraded")}</span>
      <span className="opacity-90">
        {isOffline ? t("offline.description") : t("offline.degradedHint")}
      </span>
      {pendingCount > 0 ? (
        <span className="rounded-full bg-white/20 px-2 py-0.5">
          {t("offline.queued", { count: formatNumber(pendingCount) })}
        </span>
      ) : null}
      {degraded && env.useMocks ? (
        <span className="rounded-full bg-white/20 px-2 py-0.5">{t("app.demoBadge")}</span>
      ) : null}
    </div>
  );
}

export default OfflineBanner;
