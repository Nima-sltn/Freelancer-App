import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { PROPOSAL_STATUS } from "@/config/constants";
import useProposalMutations from "./useProposalMutations";
import { formatCurrency } from "@/lib/format/numbers";
import { truncate } from "@/lib/format/text";
import { cx } from "@/lib/cx";
import { useT } from "@/store/i18n";
import type { Proposal, ProposalStatus } from "@/types";

const COLUMNS: ProposalStatus[] = [1, 2, 0];

function getColumnBadgeTone(tone: string): "success" | "danger" | "warning" {
  if (tone === "success") return "success";
  if (tone === "danger") return "danger";
  return "warning";
}

export interface ProposalBoardProps {
  readonly proposals: readonly Proposal[];
  readonly isLoading?: boolean;
}

interface ProposalBoardCardProps {
  readonly proposal: Proposal;
  readonly isEn: boolean;
  readonly isDragging: boolean;
  readonly isBusy: boolean;
  readonly onDragStart: (id: string) => void;
  readonly onDragEnd: () => void;
  readonly onMove: (proposal: Proposal, target: ProposalStatus) => void;
}

function ProposalBoardCard({
  proposal,
  isEn,
  isDragging,
  isBusy,
  onDragStart,
  onDragEnd,
  onMove,
}: Readonly<ProposalBoardCardProps>) {
  const { t } = useT();
  const desc = isEn && proposal.descriptionEn ? proposal.descriptionEn : proposal.description;
  const projectTitle = isEn && proposal.project?.titleEn ? proposal.project.titleEn : (proposal.project?.title ?? truncate(desc, 40));

  return (
    <article
      draggable
      onDragStart={() => onDragStart(proposal._id)}
      onDragEnd={onDragEnd}
      className={cx(
        "cursor-grab rounded-lg border border-line bg-surface p-3 shadow-sm transition-all active:cursor-grabbing",
        isDragging && "opacity-50"
      )}>
      <p className="text-xs font-bold text-ink">
        {projectTitle}
      </p>
      <p className="mt-1 text-[0.7rem] leading-5 text-ink-muted">
        {truncate(desc, 70)}
      </p>

      <dl className="mt-3 flex items-center justify-between text-xs font-bold">
        <dt className="sr-only">{t("field.price")}</dt>
        <dd className="text-primary-700">
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
            onClick={() => onMove(proposal, target)}
            className="flex-1 !px-2 !text-[0.65rem]">
            → {t(PROPOSAL_STATUS[target].labelKey)}
          </Button>
        ))}
      </div>
    </article>
  );
}

/**
 * Kanban-style board for managing proposals through their lifecycle.
 */
export function ProposalBoard({ proposals, isLoading }: Readonly<ProposalBoardProps>) {
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
    changeStatus(
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
                <Badge tone={getColumnBadgeTone(meta.tone)}>
                  {items.length}
                </Badge>
              </header>

              {items.length === 0 ? (
                <p className="rounded-lg border border-dashed border-line p-4 text-center text-xs text-ink-muted">
                  {t("common.empty")}
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {items.map((proposal) => (
                    <li key={proposal._id}>
                      <ProposalBoardCard
                        proposal={proposal}
                        isEn={isEn}
                        isDragging={draggingId === proposal._id}
                        isBusy={isBusy}
                        onDragStart={setDraggingId}
                        onDragEnd={() => setDraggingId(null)}
                        onMove={move}
                      />
                    </li>
                  ))}
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
