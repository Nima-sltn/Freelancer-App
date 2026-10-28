import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Timeline } from "@/components/ui/Timeline";
import { StatCard } from "@/components/ui/StatCard";
import { IconPalette, IconRefresh } from "@/components/ui/icons";
import { useTransactions } from "@/store/transaction";
import { describeImpact } from "@/entities/activity";
import type { DomainId, DomainImpact } from "@/entities/activity";
import { useT } from "@/store/i18n";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { formatNumber } from "@/lib/format/numbers";
import { formatRelative } from "@/lib/format/dates";

/**
 * Transaction inspector — the ACID guarantees, made visible.
 *
 * Every write the user performs runs through the transaction manager; this page
 * shows the resulting journal: what was attempted, whether the server confirmed
 * it, what is queued for a later sync and what was rolled back. It is both a
 * debugging tool and the demonstration of the architecture's most distinctive
 * feature.
 */
function JourneyPage() {
  const { t } = useT();
  const { entries, pendingCount, unreplayableCount, undo, flush, retry, clearHistory } = useTransactions();
  useDocumentTitle(t("tx.inspector"));

  const committed = entries.filter((entry) => entry.state === "committed").length;
  const rolledBack = entries.filter((entry) => entry.state === "rolled-back").length;
  const queued = entries.filter((entry) => entry.state === "queued").length;

  // Cross-domain projection: which parts of the system this journal reached.
  const impactTotals = new Map<DomainId, DomainImpact & { count: number }>();
  entries.forEach((entry) => {
    describeImpact({ resource: entry.resource, labelKey: entry.labelKey, state: entry.state }).forEach(
      (impact) => {
        const current = impactTotals.get(impact.domain) ?? { ...impact, count: 0 };
        current.count += 1;
        impactTotals.set(impact.domain, current);
      }
    );
  });
  const impactList = [...impactTotals.values()].sort((a, b) => b.count - a.count);

  const items = [...entries]
    .reverse()
    .map((entry) => ({
      id: entry.id,
      title: t(entry.labelKey, entry.labelParams),
      description: `${entry.resource} • ${t(`tx.state.${entry.state}`)}${
        entry.error ? ` — ${entry.error}` : ""
      }`,
      at: entry.createdAt,
      tone:
        entry.state === "committed"
          ? ("success" as const)
          : entry.state === "rolled-back"
            ? ("danger" as const)
            : entry.state === "queued"
              ? ("warning" as const)
              : ("info" as const),
      meta: (
        <span className="flex flex-wrap items-center gap-2">
          {describeImpact({ resource: entry.resource, labelKey: entry.labelKey, state: entry.state }).map(
            (impact) => (
              <Badge key={impact.domain} tone={impact.tone}>
                {t(impact.labelKey)}
              </Badge>
            )
          )}
          {entry.attempts > 1 ? (
            <Badge tone="warning">×{formatNumber(entry.attempts)}</Badge>
          ) : null}
          {entry.state === "queued" ? (
            <Button variant="outline" size="sm" onClick={() => void retry(entry.id)}>
              {t("tx.retry")}
            </Button>
          ) : null}
          {entry.state === "committed" && entry.reversible ? (
            <Button variant="outline" size="sm" onClick={() => void undo(entry.id)}>
              {t("tx.undo")}
            </Button>
          ) : null}
        </span>
      ),
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("tx.inspector")}
        description={t("tx.subtitle")}
        icon={<IconPalette />}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              leadingIcon={<IconRefresh />}
              disabled={queued === 0}
              onClick={() => void flush()}>
              {t("offline.synced")}
            </Button>
            <Button variant="ghost" size="sm" onClick={clearHistory}>
              {t("common.clearFilters")}
            </Button>
          </>
        }
      />

      {unreplayableCount > 0 ? (
        <Callout tone="warning" title={t("tx.staleWarning", { count: formatNumber(unreplayableCount) })}>
          {t("tx.unreplayable")}
        </Callout>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={t("tx.state.committed")}
          value={committed}
          tone="success"
          icon={<span aria-hidden="true">✅</span>}
        />
        <StatCard
          title={t("tx.state.pending")}
          value={pendingCount}
          tone="info"
          icon={<span aria-hidden="true">⏳</span>}
        />
        <StatCard
          title={t("tx.state.queued")}
          value={queued}
          tone="warning"
          icon={<span aria-hidden="true">📶</span>}
        />
        <StatCard
          title={t("tx.state.rolled-back")}
          value={rolledBack}
          tone="danger"
          icon={<span aria-hidden="true">↩️</span>}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader
            title={t("tx.title")}
            description={t("tx.journalSize", { count: formatNumber(entries.length) })}
            actions={
              <Button variant="outline" size="sm" onClick={() => void undo()}>
                {t("tx.undoLast")}
              </Button>
            }
          />
          <CardContent>
            <Timeline items={items} emptyMessage={t("tx.empty")} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title={t("tx.guarantees")} />
            <CardContent className="space-y-3">
              <Callout tone="success" title={t("journey.acid.atomicityTitle")}>
                {t("journey.acid.atomicityBody")}
              </Callout>
              <Callout tone="info" title={t("journey.acid.consistencyTitle")}>
                {t("journey.acid.consistencyBody")}
              </Callout>
              <Callout tone="warning" title={t("journey.acid.isolationTitle")}>
                {t("journey.acid.isolationBody")}
              </Callout>
              <Callout tone="neutral" title={t("journey.acid.durabilityTitle")}>
                {t("journey.acid.durabilityBody")}
              </Callout>
              <p className="text-xs text-ink-muted">
                {t("journey.acid.lastEvent")}:{" "}
                {entries.length > 0 ? formatRelative(entries[entries.length - 1].createdAt) : "—"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={t("tx.effects")} description={t("tx.crossDomainHint")} />
            <CardContent>
              {impactList.length === 0 ? (
                <p className="text-sm text-ink-muted">{t("tx.empty")}</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {impactList.map((impact) => (
                    <li key={impact.domain}>
                      <Badge tone={impact.tone}>
                        {t(impact.labelKey)} · {formatNumber(impact.count)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default JourneyPage;
