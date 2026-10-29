import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { ProgressBar } from "@/components/ui/Progress";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Tooltip } from "@/components/ui/Tooltip";
import { IconFire, IconStar } from "@/components/ui/icons";
import { useT } from "@/store/i18n";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format/numbers";
import type { LeaderboardRow } from "@/entities/user/trust";
import type { User } from "@/types";

/**
 * Leaderboard.
 *
 * Ranking freelancers by a transparent XP formula (proposals + wins + delivery
 * history + reviews) gamifies quality rather than volume: a spammy bidder with no
 * wins cannot outrank a smaller number of accepted, well-rated projects.
 */
function getRankMedal(rank: number): string | null {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}

export function LeaderboardTable({
  rows,
  currentUser,
}: Readonly<{
  readonly rows: readonly LeaderboardRow[];
  readonly currentUser?: User;
}>) {
  const { t } = useT();

  const columns: Array<Column<LeaderboardRow>> = [
    {
      key: "rank",
      header: t("gamification.rank"),
      align: "center",
      width: "4rem",
      render: (row) => {
        const index = rows.indexOf(row) + 1;
        const medal = getRankMedal(index);
        return (
          <span className="font-black tabular-nums text-ink">
            {medal ?? formatNumber(index)}
          </span>
        );
      },
    },
    {
      key: "user",
      header: t("field.name"),
      render: (row) => (
        <div className="flex items-center gap-2">
          <Avatar name={row.user.name} src={row.user.avatarUrl} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-bold text-ink">
              {row.user.name}
              {currentUser?._id === row.user._id ? (
                <Badge tone="primary" className="ms-2">
                  {t("gamification.you")}
                </Badge>
              ) : null}
            </p>
            <p className="text-xs text-ink-muted">{row.user.city}</p>
          </div>
        </div>
      ),
    },
    {
      key: "level",
      header: t("gamification.level"),
      render: (row) => (
        <div className="w-24">
          <p className="text-xs font-bold text-ink-soft">
            {t("gamification.level")} {formatNumber(row.level)}
          </p>
          <ProgressBar value={(row.xp % 300) / 3} size="sm" />
        </div>
      ),
    },
    {
      key: "xp",
      header: t("gamification.xp"),
      sortable: true,
      render: (row) => (
        <span className="font-black tabular-nums text-ink">{formatNumber(row.xp)}</span>
      ),
    },
    {
      key: "winRate",
      header: t("stats.winRate"),
      hideOnMobile: true,
      render: (row) => <span className="tabular-nums">{formatPercent(row.winRate)}</span>,
    },
    {
      key: "earned",
      header: t("wallet.totalEarned"),
      hideOnMobile: true,
      render: (row) => (
        <span className="tabular-nums">
          {formatCurrency((row.user.completedProjects ?? 0) * (row.user.hourlyRate ?? 0) * 8, {
            compact: true,
          })}
        </span>
      ),
    },
    {
      key: "trust",
      header: t("trust.score"),
      render: (row) => (
        <Tooltip content={row.trust.signals.map((signal) => signal.key).join(" • ")}>
          <Badge tone={row.trust.score >= 65 ? "success" : "warning"}>
            {formatNumber(row.trust.score)}
          </Badge>
        </Tooltip>
      ),
    },
  ];

  return (
    <DataTable<LeaderboardRow>
      columns={columns}
      rows={rows}
      rowKey={(row) => row.user._id}
      caption={t("gamification.leaderboard")}
      emptyTitle={t("common.empty")}
    />
  );
}

/** Earned / locked achievements for the signed-in freelancer. */
export function BadgeGrid({ badges }: Readonly<{ readonly badges: readonly string[] }>) {
  const { t } = useT();
  const all = ["firstProposal", "tenProposals", "accepted", "verified", "highRating", "veteran"];

  return (
    <Card>
      <CardHeader
        title={t("gamification.badges")}
        description={`${formatNumber(badges.length)} / ${formatNumber(all.length)}`}
        icon={<IconStar />}
      />
      <CardContent>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {all.map((badge) => {
            const earned = badges.includes(badge);
            return (
              <li
                key={badge}
                className={`flex flex-col items-center gap-2 rounded-lg border p-3 text-center transition-colors ${
                  earned ? "border-primary-500/40 bg-primary-500/5" : "border-line opacity-50"
                }`}>
                <span aria-hidden="true" className="text-2xl">
                  {earned ? "🏅" : "🔒"}
                </span>
                <span className="text-xs font-bold text-ink-soft">
                  {t(`gamification.badge.${badge}`)}
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

export function ExperienceCard({
  xp,
  level,
  progress,
  toNext,
}: Readonly<{
  readonly xp: number;
  readonly level: number;
  readonly progress: number;
  readonly toNext: number;
}>) {
  const { t } = useT();
  return (
    <Card>
      <CardHeader
        title={`${t("gamification.level")} ${formatNumber(level)}`}
        description={t("gamification.toNext", { xp: formatNumber(toNext) })}
        icon={<IconFire />}
        actions={<Badge tone="info">{formatNumber(xp)} XP</Badge>}
      />
      <CardContent>
        <ProgressBar value={progress * 100} showValue size="lg" />
      </CardContent>
    </Card>
  );
}
