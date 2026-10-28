import { PageHeader } from "@/components/layout/PageHeader";
import { LeaderboardTable, BadgeGrid, ExperienceCard } from "@/features/gamification/Leaderboard";
import { useDashboardData } from "@/features/dashboard/useDashboardData";
import { useUser } from "@/features/auth";
import { useT } from "@/store/i18n";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { IconStar } from "@/components/ui/icons";
import { formatCurrency } from "@/lib/format/numbers";

/**
 * Leaderboard page.
 *
 * Combines the public ranking with the signed-in freelancer's own progression,
 * so the page answers both "where do I stand?" and "what do I unlock next?".
 */
function LeaderboardPage() {
  const { t } = useT();
  const { user } = useUser();
  const data = useDashboardData(user, user?.role);
  useDocumentTitle(t("gamification.leaderboard"));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("gamification.leaderboard")}
        description={t("dashboard.trustSummary")}
        icon={<IconStar />}
      />

      {data.experience ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-6">
            <ExperienceCard
              xp={data.experience.xp}
              level={data.experience.level}
              progress={data.experience.levelProgress}
              toNext={data.experience.xpToNextLevel}
            />
            <BadgeGrid badges={data.experience.badges} />
          </div>

          <LeaderboardTable rows={data.leaderboard} currentUser={user} />
        </div>
      ) : (
        <LeaderboardTable rows={data.leaderboard} currentUser={user} />
      )}

      <p className="text-xs text-ink-muted">
        {t("wallet.totalEarned")}:{" "}
        {formatCurrency((user?.completedProjects ?? 0) * (user?.hourlyRate ?? 0) * 8, {
          compact: true,
        })}
      </p>
    </div>
  );
}

export default LeaderboardPage;
