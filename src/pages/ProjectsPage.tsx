import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SegmentedControl } from "@/components/ui/Tabs";
import { Pagination } from "@/components/ui/Pagination";
import { IconGrid, IconList, IconPlus } from "@/components/ui/icons";
import { useUser } from "@/features/auth";
import { useCategories } from "@/features/categories/useCategories";
import { useProjects, useOwnerProjects } from "@/features/projects/useProjects";
import { filterProjects, paginate, sortProjects } from "@/entities/project/metrics";
import { ProjectFiltersBar } from "@/features/projects/ProjectFiltersBar";
import { OwnerProjectsTable } from "@/features/projects/OwnerProjectsTable";
import { BrowseProjects } from "@/features/projects/BrowseProjects";
import { ProjectForm } from "@/features/projects/ProjectForm";
import { useQueryParams } from "@/hooks/useQueryParams";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT } from "@/store/i18n";
import type { ProjectFilters } from "@/types";

type ViewMode = "table" | "grid";

/**
 * Projects page.
 *
 * One route, three meanings: clients manage their portfolio, freelancers browse
 * and apply, admins oversee everything. Filter state, the view mode and the
 * current page all live in the URL, so any view can be shared or bookmarked.
 */
function ProjectsPage() {
  const { t } = useT();
  const { user, isLoading: userLoading } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const [creating, setCreating] = useState(searchParams.get("new") === "1");

  const role = user?.role;
  const isOwner = role === "OWNER";
  const isAdmin = role === "ADMIN";
  const prefix = isOwner ? "/owner" : isAdmin ? "/admin" : "/freelancer";

  useDocumentTitle(isOwner ? t("projects.myTitle") : t("projects.listTitle"));

  const params = useQueryParams({
    search: "",
    status: isOwner ? "" : "OPEN",
    sort: "latest",
    category: "",
    page: "1",
    pageSize: "10",
  });

  const viewMode = (searchParams.get("view") as ViewMode) ?? (role === "FREELANCER" ? "grid" : "table");
  const setViewMode = (mode: ViewMode) => {
    const next = new URLSearchParams(searchParams);
    next.set("view", mode);
    setSearchParams(next, { replace: true });
  };

  const categories = useCategories();
  const ownerQuery = useOwnerProjects({});
  const publishedQuery = useProjects({ status: "OPEN" });

  const source = isOwner ? ownerQuery.projects : publishedQuery.projects;
  const isLoading = userLoading || (isOwner ? ownerQuery.isLoading : publishedQuery.isLoading);
  const error = isOwner ? ownerQuery.error : publishedQuery.error;

  const filters: ProjectFilters = {
    search: params.values.search,
    status: params.values.status,
    sort: params.values.sort,
    category: params.values.category,
  };

  const filtered = useMemo(
    () => sortProjects(filterProjects(source, filters), filters.sort),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [source, params.values.search, params.values.status, params.values.sort, params.values.category]
  );

  const paged = paginate(filtered, Number(params.values.page), Number(params.values.pageSize));

  return (
    <div>
      <PageHeader
        title={isOwner ? t("projects.myTitle") : t("projects.listTitle")}
        description={
          isOwner ? t("projects.subtitle") : role === "FREELANCER" ? t("dashboard.recommendationsHint") : t("analytics.subtitle")
        }
        icon={<IconGrid />}
        actions={
          <>
            <SegmentedControl<ViewMode>
              value={viewMode}
              onChange={setViewMode}
              ariaLabel={t("common.filter")}
              size="sm"
              options={[
                { value: "table", label: "", icon: <IconList />, title: t("common.details") },
                { value: "grid", label: "", icon: <IconGrid />, title: t("landing.featuresTitle") },
              ]}
            />
            {isOwner || isAdmin ? (
              <Button
                leadingIcon={<IconPlus />}
                onClick={() => setCreating(true)}
                size="sm">
                {t("projects.create")}
              </Button>
            ) : null}
          </>
        }
      />

      <ProjectFiltersBar
        search={params.values.search}
        status={params.values.status}
        sort={params.values.sort}
        category={params.values.category}
        categories={
          isOwner
            ? categories.options
            : categories.filterOptions.map((option) => ({
                label: option.label,
                value: option.value,
              }))
        }
        activeCount={params.activeCount}
        onChange={(patch) => params.set(patch)}
        onReset={params.reset}
        onRefresh={() => {
          if (isOwner) void ownerQuery.refetch();
          else void publishedQuery.refetch();
        }}
        isFetching={isOwner ? ownerQuery.isFetching : publishedQuery.isFetching}
      />

      {viewMode === "grid" ? (
        <BrowseProjects
          projects={filtered}
          user={user}
          isLoading={isLoading}
          error={error}
          onRetry={() => (isOwner ? ownerQuery.refetch() : publishedQuery.refetch())}
          emptyTitle={t("projects.emptyTitle")}
          emptyDescription={isOwner ? t("projects.emptyOwner") : t("projects.emptyFreelancer")}
          limit={Number(params.values.pageSize)}
        />
      ) : (
        <>
          <OwnerProjectsTable
            projects={paged.items}
            categories={categories.options}
            isLoading={isLoading}
            error={error}
            onRetry={() => (isOwner ? ownerQuery.refetch() : publishedQuery.refetch())}
          />

          {filtered.length > Number(params.values.pageSize) ? (
            <div className="mt-5">
              <Pagination
                page={paged.page}
                pageSize={paged.pageSize}
                total={paged.total}
                onPageChange={(page) => params.set({ page: String(page) })}
                onPageSizeChange={(size) => params.set({ pageSize: String(size), page: "1" })}
              />
            </div>
          ) : null}
        </>
      )}

      <Modal
        isOpen={creating}
        onClose={() => {
          setCreating(false);
          if (searchParams.get("new")) {
            const next = new URLSearchParams(searchParams);
            next.delete("new");
            setSearchParams(next, { replace: true });
          }
        }}
        title={t("projects.create")}
        size="lg">
        <ProjectForm
          categories={categories.options}
          onClose={() => {
            setCreating(false);
            if (searchParams.get("new")) {
              const next = new URLSearchParams(searchParams);
              next.delete("new");
              setSearchParams(next, { replace: true });
            }
          }}
        />
      </Modal>

      <span className="sr-only">{prefix}</span>
    </div>
  );
}

export default ProjectsPage;
