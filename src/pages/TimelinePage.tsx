import { PageHeader } from "@/components/layout/PageHeader";
import { ProjectTimeline } from "@/features/timeline/ProjectTimeline";
import { useDashboardData } from "@/features/dashboard/useDashboardData";
import { useUser } from "@/features/auth";
import { useT } from "@/store/i18n";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { IconCalendar } from "@/components/ui/icons";

/** Gantt-style deadline view with iCalendar export. */
function TimelinePage() {
  const { t } = useT();
  const { user } = useUser();
  const data = useDashboardData(user, user?.role);
  useDocumentTitle(t("timeline.title"));

  return (
    <div>
      <PageHeader
        title={t("timeline.title")}
        description={t("timeline.subtitle")}
        icon={<IconCalendar />}
      />
      <ProjectTimeline projects={data.projects} />
    </div>
  );
}

export default TimelinePage;
