import { PageHeader } from "@/components/layout/PageHeader";
import { TrustPanel, RiskQueue, CryptographicLedgerProof } from "@/features/trust/TrustViews";
import { TrustTopologyCanvas } from "@/components/charts/TrustTopologyCanvas";
import { useDashboardData } from "@/features/dashboard/useDashboardData";
import { useProposalMutations } from "@/features/proposals/useProposalMutations";
import { useUser } from "@/features/auth";
import { buildTrustProfile } from "@/entities/user/trust";
import { useT } from "@/store/i18n";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { IconShield } from "@/components/ui/icons";
import { Callout } from "@/components/ui/Callout";

/**
 * Trust & risk.
 *
 * Admins get the risk queue; clients get their own trust summary plus the queue
 * for proposals addressed to them, so a client can sanity-check a suspicious bid
 * without escalating to support.
 */
function TrustPage() {
  const { t } = useT();
  const { user } = useUser();
  const trustProfile = user ? buildTrustProfile(user) : null;
  const data = useDashboardData(user, user?.role);
  const { changeStatus, isBusy } = useProposalMutations();
  useDocumentTitle(t("trust.title"));

  const isAdmin = user?.role === "ADMIN";
  // The page is where features meet: the trust feature *detects* a risky bid,
  // the proposals feature *decides* on it.
  const decide = (decision: {
    proposalId: string;
    projectId: string;
    status: 0 | 1 | 2;
    previousStatus: 0 | 1 | 2;
  }) => {
    changeStatus(
      decision.proposalId,
      decision.projectId,
      decision.status,
      decision.previousStatus
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("trust.title")}
        description={t("dashboard.trustSummary")}
        icon={<IconShield />}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {user ? <TrustPanel user={user} compact /> : null}
        <CryptographicLedgerProof />
      </div>

      <TrustTopologyCanvas trustScore={trustProfile?.score ?? 92} />

      {isAdmin ? null : <Callout tone="info">{t("trust.queue")}</Callout>}
      <RiskQueue
        proposals={data.proposals}
        projects={data.projects}
        isLoading={data.isLoading}
        onDecide={decide}
        isDeciding={isBusy}
      />
    </div>
  );
}

export default TrustPage;
