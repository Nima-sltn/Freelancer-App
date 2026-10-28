import { queryKeys } from "@/config/queryKeys";
import { proposalService } from "@/services";
import { command, useTransactions } from "@/store/transaction";
import { useT } from "@/store/i18n";
import { validateProposalPayload } from "@/lib/validators";
import type { CreateProposalData, ProposalStatus, Proposal } from "@/types";

/**
 * Proposal writes.
 *
 * The status change is the clearest case for optimistic UI in this product: the
 * kanban board and the review modal both flip immediately, and if the server
 * rejects the change the card animates back — with a compensating undo available
 * because the API supports the reverse status write.
 */
function patchProposal(current: unknown, proposalId: string, status: ProposalStatus): unknown {
  if (!Array.isArray(current)) return current;
  return current.map((item) =>
    (item as Proposal)?._id === proposalId ? { ...(item as Proposal), status } : item
  );
}

export function useProposalMutations() {
  const { run, undo, isBusy } = useTransactions();
  const { t } = useT();

  const createProposal = (
    data: CreateProposalData,
    options?: { onSuccess?: () => void; projectTitle?: string }
  ) =>
    run<{ message: string }>({
      resource: `project:${data.projectId}`,
      labelKey: "audit.proposal.submitted",
      labelParams: { title: options?.projectTitle ?? "" },
      validate: () => validateProposalPayload(data),
      request: () => proposalService.create(data),
      // Serialised twin of `request`: if the user goes offline mid-submit the
      // outbox re-sends this exact write after a reload, not a lost closure.
      command: command("proposal.create", { data }),
      invalidate: [
        queryKeys.proposals.all,
        queryKeys.projects.all,
        queryKeys.projects.detail(data.projectId),
      ],
      successMessage: t("proposals.create") + " ✓",
      onSuccess: () => options?.onSuccess?.(),
    });

  const changeStatus = (
    proposalId: string,
    projectId: string,
    status: ProposalStatus,
    previousStatus?: ProposalStatus
  ) =>
    run<{ message: string }>({
      resource: `proposal:${proposalId}`,
      labelKey: `audit.proposal.status.${status}`,
      patches: [
        {
          queryKey: queryKeys.proposals.all,
          updater: (current) => patchProposal(current, proposalId, status),
        },
      ],
      request: () => proposalService.changeStatus({ proposalId, projectId, status }),
      command: command("proposal.changeStatus", { proposalId, projectId, status }),
      invalidate: [
        queryKeys.proposals.all,
        queryKeys.projects.all,
        queryKeys.projects.detail(projectId),
      ],
      compensate:
        previousStatus === undefined
          ? undefined
          : () =>
              proposalService.changeStatus({ proposalId, projectId, status: previousStatus }),
      // Serialised twin of `compensate`: undo still reaches the server even
      // when the entry was reloaded from the journal (saga compensation).
      compensateCommand:
        previousStatus === undefined
          ? undefined
          : command("proposal.changeStatus", {
              proposalId,
              projectId,
              status: previousStatus,
            }),
    });

  return { createProposal, changeStatus, undoLastChange: () => undo(), isBusy };
}

export default useProposalMutations;
