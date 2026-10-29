import { useMemo } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { IconCalendar, IconDownload } from "@/components/ui/icons";
import { useT } from "@/store/i18n";
import { addDays, daysBetween, formatDate, formatDateShort, toIcsDate } from "@/lib/format/dates";
import { downloadIcs, exportFilename } from "@/lib/export";
import { formatCurrency } from "@/lib/format/numbers";
import { truncate } from "@/lib/format/text";
import { cx } from "@/lib/cx";
import type { Project } from "@/types";

const WINDOW_DAYS = 120;

interface TimelineRow {
  project: Project;
  startOffset: number;
  duration: number;
  isOverdue: boolean;
}

function getTimelineBarBg(isOverdue: boolean, status: Project["status"]): string {
  if (isOverdue) return "bg-danger";
  if (status === "CLOSED") return "bg-info";
  return "bg-primary-600";
}

/**
 * Project timeline (Gantt-lite).
 *
 * Projects are positioned on a shared 120-day window from their creation date to
 * their deadline, which makes overlapping commitments immediately visible — a
 * question a table simply cannot answer. Deadlines can be exported to iCalendar
 * so they land in the user's own calendar, a small cross-domain bridge between
 * the app and the user's tooling.
 */
export function ProjectTimeline({ projects }: Readonly<{ readonly projects: readonly Project[] }>) {
  const { t } = useT();

  const { rows, windowStart } = useMemo(() => {
    const sorted = [...projects].sort(
      (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    );
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const mapped: TimelineRow[] = sorted.slice(0, 14).map((project) => {
      const created = project.createdAt ? new Date(project.createdAt) : start;
      const deadline = new Date(project.deadline);
      const startOffset = Math.max(-30, Math.min(WINDOW_DAYS, daysBetween(start, created)));
      const span = Math.max(3, daysBetween(created, deadline));
      return {
        project,
        startOffset,
        duration: Math.min(WINDOW_DAYS - startOffset, span),
        isOverdue: deadline.getTime() < Date.now() && project.status === "OPEN",
      };
    });

    return { rows: mapped, windowStart: start };
  }, [projects]);

  const ticks = useMemo(
    () =>
      Array.from({ length: 5 }, (_, index) => ({
        date: addDays(windowStart, Math.round((WINDOW_DAYS / 4) * index)),
        offset: (WINDOW_DAYS / 4) * index,
      })),
    [windowStart]
  );

  const exportCalendar = () => {
    downloadIcs(
      exportFilename("deadlines", "ics"),
      rows.map((row) => ({
        uid: row.project._id,
        title: row.project.title,
        description: `${formatCurrency(row.project.budget)} • ${row.project.category?.title ?? ""}`,
        start: row.project.deadline,
      }))
    );
  };

  return (
    <Card>
      <CardHeader
        title={t("timeline.title")}
        description={t("timeline.subtitle")}
        icon={<IconCalendar />}
        actions={
          <Button
            variant="outline"
            size="sm"
            leadingIcon={<IconDownload />}
            onClick={exportCalendar}>
            {t("timeline.addToCalendar")}
          </Button>
        }
      />
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-muted">{t("timeline.noDeadlines")}</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[46rem]">
              <div className="mb-2 flex items-center justify-between text-[0.7rem] font-bold text-ink-muted">
                {ticks.map((tick) => (
                  <span key={tick.offset}>{formatDateShort(tick.date)}</span>
                ))}
              </div>

              <ul className="space-y-2">
                {rows.map((row) => (
                  <li key={row.project._id} className="flex items-center gap-3">
                    <span
                      className="w-44 shrink-0 truncate text-xs font-bold text-ink-soft"
                      title={row.project.title}>
                      {truncate(row.project.title, 26)}
                    </span>

                    <span className="relative h-6 flex-1 rounded-md bg-surface-sunken">
                      <Tooltip
                        content={`${row.project.title}\n${formatDate(row.project.deadline)}`}>
                        <span
                          className={cx(
                            "absolute top-0 h-6 rounded-md px-2 text-[0.65rem] font-black text-white",
                            getTimelineBarBg(row.isOverdue, row.project.status)
                          )}
                          style={{
                            insetInlineStart: `${(row.startOffset / WINDOW_DAYS) * 100}%`,
                            width: `${(row.duration / WINDOW_DAYS) * 100}%`,
                            minWidth: "3rem",
                          }}
                        />
                      </Tooltip>
                    </span>

                    <span className="w-24 shrink-0 text-end text-[0.7rem] text-ink-muted">
                      {formatDateShort(row.project.deadline)}
                    </span>

                    {row.isOverdue ? (
                      <Badge tone="danger" className="shrink-0">
                        {t("projects.overdue", { days: Math.abs(daysBetween(new Date(), row.project.deadline)) })}
                      </Badge>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export { toIcsDate };
