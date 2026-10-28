import { PageHeader } from "@/components/layout/PageHeader";
import { WalletOverview, useLedger } from "@/features/wallet/WalletViews";
import { useDashboardData } from "@/features/dashboard/useDashboardData";
import { useUser } from "@/features/auth";
import { useT } from "@/store/i18n";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { IconWallet } from "@/components/ui/icons";

/** Escrow, payouts and platform fees derived from the proposal pipeline. */
function WalletPage() {
  const { t } = useT();
  const { user } = useUser();
  const data = useDashboardData(user, user?.role);
  const entries = useLedger(user?.role, data.proposals);
  useDocumentTitle(t("wallet.title"));

  return (
    <div>
      <PageHeader title={t("wallet.title")} description={t("wallet.subtitle")} icon={<IconWallet />} />
      <WalletOverview entries={entries} isLoading={data.isLoading} />
    </div>
  );
}

export default WalletPage;
