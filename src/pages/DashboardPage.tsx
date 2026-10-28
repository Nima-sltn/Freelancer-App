import { useUser } from "@/features/auth";
import { useDashboardData } from "@/features/dashboard/useDashboardData";
import { DashboardSwitch } from "@/features/dashboard/RoleDashboards";
import { PageLoader } from "@/components/feedback/Loading";
import { useT } from "@/store/i18n";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { ErrorState } from "@/components/ui/EmptyState";

/** Single dashboard route rendered per role from one derived data set. */
function DashboardPage() {
  const { t } = useT();
  const { user, isLoading: userLoading } = useUser();
  const data = useDashboardData(user, user?.role);
  useDocumentTitle(t("nav.dashboard"));

  if (userLoading || !user) return <PageLoader />;

  if (data.isError && !data.isLoading) {
    return <ErrorState error={undefined} onRetry={data.refetchAll} />;
  }

  return <DashboardSwitch data={data} user={user} />;
}

export default DashboardPage;
