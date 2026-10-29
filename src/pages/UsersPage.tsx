import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, UserStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { SegmentedControl } from "@/components/ui/Tabs";
import { TrustPanel } from "@/features/trust/TrustViews";
import { useUsers, useChangeUserStatus } from "@/features/users/useUsers";
import { useT } from "@/store/i18n";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { formatRelative } from "@/lib/format/dates";
import { formatDigits } from "@/lib/format/numbers";
import { useQueryParams } from "@/hooks/useQueryParams";
import { IconUsers } from "@/components/ui/icons";
import type { User, UserStatus } from "@/types";

type Filter = "all" | "pending" | "verified" | "rejected";

/** Admin moderation console: verification queue, filtering and per-user trust. */
function UsersPage() {
  const { t } = useT();
  const { users, isLoading } = useUsers();
  const { changeStatus, isPending } = useChangeUserStatus();
  const [selected, setSelected] = useState<User | null>(null);
  const [rejecting, setRejecting] = useState<User | null>(null);
  const params = useQueryParams({ status: "all", search: "" });
  useDocumentTitle(t("users.title"));

  const filtered = useMemo(() => {
    const status = params.values.status;
    return users.filter((user) => {
      const matchesStatus =
        status === "all" ||
        (status === "pending" && Number(user.status) === 1) ||
        (status === "verified" && Number(user.status) === 2) ||
        (status === "rejected" && Number(user.status) === 0);
      const matchesSearch =
        !params.values.search ||
        `${user.name} ${user.email} ${user.phoneNumber}`
          .toLowerCase()
          .includes(params.values.search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [params.values.search, params.values.status, users]);

  const columns: Array<Column<User>> = [
    {
      key: "name",
      header: t("field.name"),
      sortable: true,
      render: (user) => (
        <button
          type="button"
          onClick={() => setSelected(user)}
          className="flex items-center gap-2 text-start">
          <Avatar name={user.name || user.phoneNumber} src={user.avatarUrl} size="sm" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-ink">{user.name || "—"}</span>
            <span className="block truncate text-xs text-ink-muted">{user.email || "—"}</span>
          </span>
        </button>
      ),
    },
    {
      key: "phoneNumber",
      header: t("field.phone"),
      hideOnMobile: true,
      render: (user) => <span className="tabular-nums">{formatDigits(user.phoneNumber)}</span>,
    },
    {
      key: "role",
      header: t("field.role"),
      render: (user) => <Badge tone={user.role === "ADMIN" ? "primary" : "neutral"}>{t(`role.${user.role}`)}</Badge>,
    },
    {
      key: "status",
      header: t("common.status"),
      render: (user) => <UserStatusBadge status={user.status} />,
    },
    {
      key: "rating",
      header: t("field.rating"),
      hideOnMobile: true,
      render: (user) => <span className="tabular-nums">{(user.rating ?? 0).toFixed(1)}</span>,
    },
    {
      key: "createdAt",
      header: t("common.created"),
      hideOnMobile: true,
      render: (user) => <span className="text-xs text-ink-muted">{formatRelative(user.createdAt)}</span>,
    },
    {
      key: "actions",
      header: t("common.actions"),
      align: "end",
      render: (user) => (
        <div className="flex justify-end gap-1.5">
          {Number(user.status) !== 2 ? (
            <Button
              variant="success"
              size="sm"
              disabled={isPending}
              onClick={() =>
                changeStatus({ userId: user._id, status: 2 as UserStatus })
              }>
              {t("status.user.verified")}
            </Button>
          ) : null}
          {Number(user.status) !== 0 ? (
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => setRejecting(user)}>
              {t("status.user.rejected")}
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  const pending = users.filter((user) => Number(user.status) === 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("users.title")}
        description={t("users.subtitle")}
        icon={<IconUsers />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title={t("stats.totalUsers")} value={users.length} tone="primary" icon={<span aria-hidden="true">👥</span>} />
        <StatCard title={t("stats.pendingUsers")} value={pending.length} tone="warning" icon={<span aria-hidden="true">⏳</span>} />
        <StatCard
          title={t("users.totalFreelancers")}
          value={users.filter((user) => user.role === "FREELANCER").length}
          tone="info"
          icon={<span aria-hidden="true">🧑‍💻</span>}
        />
        <StatCard
          title={t("users.totalOwners")}
          value={users.filter((user) => user.role === "OWNER").length}
          tone="success"
          icon={<span aria-hidden="true">🏢</span>}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl<Filter>
          value={params.values.status as Filter}
          onChange={(value) => params.set({ status: value })}
          ariaLabel={t("common.filter")}
          options={[
            { value: "all", label: t("common.all") },
            { value: "pending", label: t("users.filterPending") },
            { value: "verified", label: t("users.filterVerified") },
            { value: "rejected", label: t("users.filterRejected") },
          ]}
        />
        <input
          value={params.values.search}
          onChange={(event) => params.set({ search: event.target.value })}
          placeholder={t("common.searchPlaceholder")}
          aria-label={t("common.search")}
          className="field-input max-w-xs"
        />
      </div>

      <DataTable<User>
        columns={columns}
        rows={filtered}
        rowKey={(user) => user._id}
        caption={t("users.title")}
        isLoading={isLoading}
        emptyTitle={t("common.empty")}
      />

      <Modal
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ""}
        size="md">
        {selected ? <TrustPanel user={selected} /> : null}
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(rejecting)}
        onClose={() => setRejecting(null)}
        title={t("status.user.rejected")}
        message={`${t("users.changeStatus")}: ${rejecting?.name ?? ""}`}
        tone="danger"
        isLoading={isPending}
        onConfirm={() => {
          if (!rejecting) return;
          changeStatus(
            { userId: rejecting._id, status: 0 as UserStatus },
            { onSettled: () => setRejecting(null) }
          );
        }}
      />
    </div>
  );
}

export default UsersPage;
