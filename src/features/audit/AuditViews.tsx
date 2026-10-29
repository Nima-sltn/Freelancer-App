import { useMemo } from "react";
import type { ReactNode } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge, type Tone as BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Timeline, type TimelineItem } from "@/components/ui/Timeline";
import { IconDownload, IconTrash } from "@/components/ui/icons";
import { useT } from "@/store/i18n";
import { useTransactions } from "@/store/transaction";
import { downloadCsv, exportFilename } from "@/lib/export";
import { formatRelative } from "@/lib/format/dates";
import { buildAuditFeed, auditSourceCounts, impactsForAuditEntry } from "@/entities/activity";
import type { DomainImpact } from "@/entities/activity";
import type { AuditEntry, Project, User } from "@/types";

function getAuditEntryTone(entry: AuditEntry): "success" | "danger" | "warning" | "primary" {
  if (entry.state === "committed" || entry.actionKey.endsWith(".2")) return "success";
  if (entry.state === "rolled-back" || entry.actionKey.endsWith(".0")) return "danger";
  if (entry.state === "queued" || entry.state === "pending") return "warning";
  return "primary";
}

export interface AuditTimelineProps {
  readonly projects: Project[];
  readonly users?: User[];
  readonly showLocal?: boolean;
  readonly limit?: number;
}

/**
 * Audit trail — a *view* over `entities/activity`.
 *
 * The merge itself (server-reconstructed domain events + the local ACID
 * journal) is pure logic in `buildAuditFeed`, so this component only decides how
 * to present it. Each row also renders the **cross-domain impact** of the event:
 * the domains the write reached (wallet, trust, leaderboard, notifications…),
 * which turns "your click did something" into "your click moved these five
 * parts of the system" — the couplings are stated, not implied.
 */
export function AuditTimeline({
  projects,
  users = [],
  showLocal = true,
  limit = 40,
}: Readonly<AuditTimelineProps>) {
  const { t } = useT();
  const { entries, clearHistory } = useTransactions();

  const feed = useMemo(
    () =>
      buildAuditFeed({
        projects,
        users,
        writes: showLocal ? entries : [],
        limit,
      }),
    [entries, limit, projects, showLocal, users]
  );

  const counts = useMemo(() => auditSourceCounts(feed), [feed]);

  const items = useMemo<TimelineItem[]>(() => {
    const titleFor = (entry: AuditEntry) =>
      t(entry.actionKey, {
        title: entry.entityLabel,
        name: entry.entityLabel,
        ...(entry.meta ?? {}),
      });

    return feed.map((entry) => {
      const sourceStr = t(`audit.source.${entry.source}`);
      return {
        id: entry.id,
        title: titleFor(entry),
        description: `${entry.actorName} • ${sourceStr}`,
        at: entry.at,
        tone: getAuditEntryTone(entry),
        meta: <RowMeta entry={entry} impacts={impactsForAuditEntry(entry)} label={impactLabel} />,
      };
    });
    // `impactLabel` is a stable bound translator.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed, t]);

  function impactLabel(impact: DomainImpact): string {
    return t(impact.labelKey);
  }

  return (
    <Card>
      <CardHeader
        title={t("audit.title")}
        description={t("audit.subtitle")}
        actions={
          <>
            <Badge tone="neutral">{t("audit.source.remoteCount", { count: counts.remote })}</Badge>
            <Badge tone="info">{t("audit.source.localCount", { count: counts.local })}</Badge>
            <Button
              variant="outline"
              size="sm"
              leadingIcon={<IconDownload />}
              onClick={() =>
                downloadCsv(
                  exportFilename("audit", "csv"),
                  feed.map((entry) => ({
                    event: entry.actionKey,
                    at: entry.at,
                    source: entry.source,
                    detail: entry.entityLabel,
                  })),
                  [
                    { key: "event", label: "event" },
                    { key: "at", label: "at" },
                    { key: "source", label: "source" },
                    { key: "detail", label: "detail" },
                  ]
                )
              }>
              {t("audit.exportCsv")}
            </Button>
            {showLocal && entries.length > 0 ? (
              <Button variant="ghost" size="sm" leadingIcon={<IconTrash />} onClick={clearHistory}>
                {t("common.clearFilters")}
              </Button>
            ) : null}
          </>
        }
      />
      <CardContent>
        <Timeline items={items} emptyMessage={t("audit.empty")} />
        <p className="mt-4 text-xs text-ink-muted">
          {t("common.lastUpdated")}: {formatRelative(new Date())}
        </p>
      </CardContent>
    </Card>
  );
}

export interface RowMetaProps {
  readonly entry: AuditEntry;
  readonly impacts: DomainImpact[];
  readonly label: (impact: DomainImpact) => string;
}

/** Badges for the domains an event reached, plus the failure, if any. */
function RowMeta({
  entry,
  impacts,
  label,
}: Readonly<RowMetaProps>): ReactNode {
  const { t } = useT();

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {impacts.map((impact) => (
        <Badge key={impact.domain} tone={impact.tone as BadgeTone}>
          {label(impact)}
        </Badge>
      ))}
      {entry.error ? <span className="text-xs text-danger">{entry.error}</span> : null}
      {entry.state && entry.state !== "committed" ? (
        <Badge tone="neutral">{t(`tx.state.${entry.state}`)}</Badge>
      ) : null}
    </span>
  );
}

export default AuditTimeline;
