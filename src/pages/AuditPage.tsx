import { PageHeader } from "@/components/layout/PageHeader";
import { AuditTimeline } from "@/features/audit/AuditViews";
import { useDashboardData } from "@/features/dashboard/useDashboardData";
import { useUser } from "@/features/auth";
import { useT } from "@/store/i18n";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { IconClipboard } from "@/components/ui/icons";

/** Audit log: server-reconstructed events plus the local transaction journal. */
function AuditPage() {
  const { t } = useT();
  const { user } = useUser();
  const data = useDashboardData(user, user?.role);
  useDocumentTitle(t("audit.title"));

  return (
    <div>
      <PageHeader
        title={t("audit.title")}
        description={t("audit.subtitle")}
        icon={<IconClipboard />}
      />
      <AuditTimeline projects={data.projects} users={data.users} />
    </div>
  );
}

export default AuditPage;
