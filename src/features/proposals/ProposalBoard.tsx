import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { useT } from "@/store/i18n";
import { formatCurrency } from "@/lib/format/numbers";
import { truncate } from "@/lib/format/text";
import { PROPOSAL_STATUS } from "@/config/constants";
import { cx } from "@/lib/cx";
import type { Proposal, ProposalStatus } from "@/types";
import useProposalMutations from "./useProposalMutations";

const COLUMNS: ProposalStatus[] = [1, 2, 0];

/**
 * Kanban view of the proposal pipeline.
 *
 * Drag & drop uses the native HTML5 API (no dependency, no layout thrash). Every
 * drag has an equivalent keyboard path — the card exposes move buttons — because
 * drag-only interfaces are unusable with a keyboard or a screen reader. Status
 * changes flow through the transaction manager, so a rejected write animates the
 * card back to its column.
 */
export function ProposalBoard({ proposals, isLoading }: { proposals: Proposal[]; isLoading?: boolean }) {
  const { t, locale } = useT();
  const { changeStatus, isBusy } = useProposalMutations();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverColumn, setHoverColumn] = useState<ProposalStatus | null>(null);
  const isEn = locale === "en";

  const grouped = useMemo(() => {
    const map = new Map<ProposalStatus, Proposal[]>();
    COLUMNS.forEach((column) => map.set(column, []));
    proposals.forEach((proposal) => {
      const bucket = map.get(proposal.status);
      if (bucket) bucket.push(proposal);
    });
    return map;
  }, [proposals]);

  const move = (proposal: Proposal, status: ProposalStatus) => {
    if (proposal.status === status) return;
    if (!proposal.projectId && !proposal.project?._id) {
      toast.error(t("common.errorHint"));
      return;
    }
    void changeStatus(
      proposal._id,
      proposal.projectId ?? proposal.project?._id ?? "",
      status,
      proposal.status
    );
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {COLUMNS.map((column) => (
          <div key={column} className="card p-4">
            <div className="skeleton mb-3 h-4 w-24" />
            <div className="space-y-3">
              <div className="skeleton h-24" />
              <div className="skeleton h-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Callout tone="neutral">{t("proposal.dragHint")}</Callout>

      <div className="grid gap-4 md:grid-cols-3">
        {COLUMNS.map((column) => {
          const items = grouped.get(column) ?? [];
          const meta = PROPOSAL_STATUS[column];
          return (
            <section
              key={column}
              aria-label={t(meta.labelKey)}
              onDragOver={(event) => {
                event.preventDefault();
                setHoverColumn(column);
              }}
              onDragLeave={() => setHoverColumn(null)}
              onDrop={(event) => {
                event.preventDefault();
                setHoverColumn(null);
                const proposal = proposals.find((item) => item._id === draggingId);
                if (proposal) move(proposal, column);
                setDraggingId(null);
              }}
              className={cx(
                "card flex min-h-64 flex-col gap-3 p-4 transition-colors",
                hoverColumn === column && "border-primary-500 bg-primary-500/5"
              )}>
              <header className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-black text-ink">{t(meta.labelKey)}</h2>
                <Badge tone={meta.tone === "success" ? "success" : meta.tone === "danger" ? "danger" : "warning"}>
                  {items.length}
                </Badge>
              </header>

              {items.length === 0 ? (
                <p className="rounded-lg border border-dashed border-line p-4 text-center text-xs text-ink-muted">
                  {t("common.empty")}
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {items.map((proposal) => {
                    const desc = isEn && proposal.descriptionEn ? proposal.descriptionEn : proposal.description;
                    const projectTitle = isEn && proposal.project?.titleEn ? proposal.project.titleEn : (proposal.project?.title ?? truncate(desc, 40));
                    return (
                      <li key={proposal._id}>
                        <article
                          draggable
                          onDragStart={() => setDraggingId(proposal._id)}
                          onDragEnd={() => setDraggingId(null)}
                          className={cx(
                            "cursor-grab rounded-lg border border-line bg-surface p-3 shadow-sm transition-all active:cursor-grabbing",
                            draggingId === proposal._id && "opacity-50"
                          )}>
                          <p className="text-xs font-bold text-ink">
                            {projectTitle}
                          </p>
                          <p className="mt-1 text-[0.7rem] leading-5 text-ink-muted">
                            {truncate(desc, 70)}
                          </p>
                        <dl className="mt-2 flex items-center justify-between text-[0.7rem]">
                          <dt className="sr-only">{t("field.price")}</dt>
                          <dd className="font-black text-ink tabular-nums">
                            {formatCurrency(proposal.price)}
                          </dd>
                          <dt className="sr-only">{t("field.duration")}</dt>
                          <dd className="text-ink-muted">
                            {proposal.duration} {t("common.days")}
                          </dd>
                        </dl>

                        <div className="mt-3 flex gap-1.5">
                          {COLUMNS.filter((target) => target !== proposal.status).map((target) => (
                            <Button
                              key={target}
                              variant="outline"
                              size="sm"
                              disabled={isBusy}
                              onClick={() => move(proposal, target)}
                              className="flex-1 !px-2 !text-[0.65rem]">
                              → {t(PROPOSAL_STATUS[target].labelKey)}
                            </Button>
                          ))}
                        </div>
                      </article>
                    </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default ProposalBoard;
