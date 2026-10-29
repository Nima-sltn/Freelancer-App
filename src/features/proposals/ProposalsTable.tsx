import { useState } from "react";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { ProposalStatusBadge, Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { RHFSelect } from "@/components/form";
import { useForm } from "react-hook-form";
import { useT } from "@/store/i18n";
import { formatCurrency } from "@/lib/format/numbers";
import { truncate } from "@/lib/format/text";
import { formatRelative } from "@/lib/format/dates";
import type { Proposal, ProposalStatus } from "@/types";
import { assessProposalRisk } from "@/entities/proposal/matching";
import useProposalMutations from "./useProposalMutations";
import { PROPOSAL_STATUS } from "@/config/constants";

const STATUS_OPTIONS = ([0, 1, 2] as ProposalStatus[]).map((status) => ({
  value: status,
  labelKey: PROPOSAL_STATUS[status].labelKey,
}));

function ReviewForm({
  proposal,
  onClose,
}: Readonly<{
  readonly proposal: Proposal;
  readonly onClose: () => void;
}>) {
  const { t } = useT();
  const { changeStatus, isBusy } = useProposalMutations();
  const { register, handleSubmit } = useForm<{ status: string }>({
    defaultValues: { status: String(proposal.status) },
  });

  const submit = handleSubmit((values) => {
    const status = Number(values.status) as ProposalStatus;
    changeStatus(
      proposal._id,
      proposal.projectId ?? proposal.project?._id ?? "",
      status,
      proposal.status
    ).then(() => onClose());
  });

  return (
    <form className="space-y-5" onSubmit={submit}>
      <RHFSelect<{ status: string }>
        name="status"
        label={t("proposals.changeStatus")}
        register={register}
        options={STATUS_OPTIONS.map((option) => ({ value: option.value, label: t(option.labelKey) }))}
        required
      />
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" isLoading={isBusy}>
          {t("common.confirm")}
        </Button>
      </div>
    </form>
  );
}

/**
 * Proposal table.
 *
 * Shared by the freelancer ("my proposals") and owner/admin ("proposals on this
 * project") views; the `canReview` flag decides whether the status column is
 * interactive, so review permissions live in one place.
 */
export function ProposalsTable({
  proposals,
  isLoading,
  error,
  onRetry,
  canReview = false,
  emptyTitle,
  emptyDescription,
  showProject = false,
  rowLimit,
}: Readonly<{
  readonly proposals: readonly Proposal[];
  readonly isLoading?: boolean;
  readonly error?: unknown;
  readonly onRetry?: () => void;
  readonly canReview?: boolean;
  readonly emptyTitle?: string;
  readonly emptyDescription?: string;
  readonly showProject?: boolean;
  readonly rowLimit?: number;
}>) {
  const { t, locale } = useT();
  const [reviewing, setReviewing] = useState<Proposal | null>(null);
  const rows = rowLimit ? proposals.slice(0, rowLimit) : proposals;
  const isEn = locale === "en";

  const columns: Array<Column<Proposal>> = [
    {
      key: "description",
      header: t("field.description"),
      render: (proposal) => {
        const desc = isEn && proposal.descriptionEn ? proposal.descriptionEn : proposal.description;
        const projectTitle = isEn && proposal.project?.titleEn ? proposal.project.titleEn : proposal.project?.title;
        return (
          <div className="min-w-48">
            <p className="text-ink">{truncate(desc, 60)}</p>
            {showProject && proposal.project ? (
              <p className="mt-0.5 text-xs text-ink-muted">{projectTitle}</p>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "author",
      header: t("field.freelancer"),
      hideOnMobile: true,
      render: (proposal) => {
        const author = proposal.user as { name?: string } | undefined;
        return <span className="text-xs font-bold text-ink-soft">{author?.name ?? "—"}</span>;
      },
    },
    {
      key: "price",
      header: t("field.price"),
      sortable: true,
      render: (proposal) => (
        <span className="tabular-nums font-bold text-ink">{formatCurrency(proposal.price)}</span>
      ),
    },
    {
      key: "duration",
      header: t("field.duration"),
      render: (proposal) => (
        <span className="tabular-nums">
          {proposal.duration} {t("common.days")}
        </span>
      ),
    },
    {
      key: "risk",
      header: t("nav.trust"),
      hideOnMobile: true,
      render: (proposal) => {
        const risk = assessProposalRisk(proposal);
        if (risk.flags.length === 0) return <Badge tone="success">{t("trust.riskLow")}</Badge>;
        return (
          <Badge tone={risk.level === "high" ? "danger" : "warning"}>
            {risk.level === "high" ? t("trust.riskHigh") : t("trust.riskMedium")}
          </Badge>
        );
      },
    },
    {
      key: "status",
      header: t("common.status"),
      render: (proposal) => (
        <div className="flex items-center gap-2">
          <ProposalStatusBadge status={proposal.status} />
          {canReview ? (
            <button
              type="button"
              onClick={() => setReviewing(proposal)}
              className="text-xs font-bold text-primary-700 hover:underline">
              {t("proposals.changeStatus")}
            </button>
          ) : null}
        </div>
      ),
    },
    {
      key: "createdAt",
      header: t("common.created"),
      hideOnMobile: true,
      render: (proposal) => (
        <span className="text-xs text-ink-muted">{formatRelative(proposal.createdAt)}</span>
      ),
    },
  ];

  return (
    <>
      <DataTable<Proposal>
        columns={columns}
        rows={rows}
        rowKey={(proposal) => proposal._id}
        caption={t("proposals.title")}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        emptyTitle={emptyTitle ?? t("proposals.emptyTitle")}
        emptyDescription={emptyDescription ?? t("proposals.emptyHint")}
      />

      <Modal
        isOpen={Boolean(reviewing)}
        onClose={() => setReviewing(null)}
        title={t("proposals.changeStatus")}
        size="sm">
        {reviewing ? (
          <ReviewForm proposal={reviewing} onClose={() => setReviewing(null)} />
        ) : null}
      </Modal>
    </>
  );
}

export default ProposalsTable;
