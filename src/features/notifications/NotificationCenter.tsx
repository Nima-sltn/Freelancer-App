import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/Tabs";
import { IconBell } from "@/components/ui/icons";
import { useNotifications } from "@/store/notifications";
import { useT } from "@/store/i18n";
import { formatRelative } from "@/lib/format/dates";
import { formatNumber } from "@/lib/format/numbers";
import { cx } from "@/lib/cx";

type Filter = "all" | "unread";

/** Notification centre with read tracking and deep links into the app. */
export function NotificationCenter() {
  const { t } = useT();
  const { items, unreadCount, markRead, markAllRead, remove } = useNotifications();
  const [filter, setFilter] = useState<Filter>("all");

  const visible = useMemo(
    () => (filter === "unread" ? items.filter((item) => !item.read) : items),
    [filter, items]
  );

  if (items.length === 0) {
    return <EmptyState icon={<IconBell />} title={t("notifications.empty")} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl<Filter>
          value={filter}
          onChange={setFilter}
          ariaLabel={t("notifications.title")}
          options={[
            { value: "all", label: t("common.all") },
            { value: "unread", label: `${t("common.all")} (${formatNumber(unreadCount)})` },
          ]}
        />
        {unreadCount > 0 ? (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            {t("notifications.markAllRead")}
          </Button>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <EmptyState title={t("notifications.empty")} />
      ) : (
        <ul className="space-y-2">
          {visible.map((item) => (
            <li key={item.id}>
              <Card
                padding="sm"
                className={cx("flex items-start gap-3", !item.read && "border-primary-500/40")}>
                <span
                  aria-hidden="true"
                  className={cx(
                    "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                    item.severity === "success" && "bg-success",
                    item.severity === "warning" && "bg-warning",
                    item.severity === "danger" && "bg-danger",
                    item.severity === "info" && "bg-info"
                  )}
                />
                <CardContent className="mt-0 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-ink">{t(item.titleKey, item.params)}</p>
                    {!item.read ? <Badge tone="primary">{t("common.new")}</Badge> : null}
                  </div>
                  {item.bodyKey ? (
                    <p className="mt-1 text-xs leading-6 text-ink-muted">{t(item.bodyKey, item.params)}</p>
                  ) : null}
                  <p className="mt-1 text-[0.7rem] text-ink-muted">{formatRelative(item.createdAt)}</p>
                </CardContent>

                <div className="flex shrink-0 flex-col gap-1">
                  {item.href ? (
                    <Link
                      to={item.href}
                      onClick={() => markRead(item.id)}
                      className="text-xs font-bold text-primary-700 hover:underline">
                      {t("common.details")}
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    className="text-xs font-bold text-ink-muted hover:text-danger">
                    {t("common.close")}
                  </button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default NotificationCenter;
