import { PageHeader } from "@/components/layout/PageHeader";
import { NotificationCenter } from "@/features/notifications/NotificationCenter";
import { useNotifications } from "@/store/notifications";
import { useT } from "@/store/i18n";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { IconBell } from "@/components/ui/icons";
import { formatNumber } from "@/lib/format/numbers";

/** Full notification centre with unread filtering. */
function NotificationsPage() {
  const { t } = useT();
  const { unreadCount } = useNotifications();
  useDocumentTitle(t("notifications.title"));

  return (
    <div>
      <PageHeader
        title={t("notifications.title")}
        description={t("notifications.unread", { count: formatNumber(unreadCount) })}
        icon={<IconBell />}
      />
      <NotificationCenter />
    </div>
  );
}

export default NotificationsPage;
