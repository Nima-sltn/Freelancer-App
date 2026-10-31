import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useUser } from "@/features/auth";
import { useProjects, useOwnerProjects } from "@/features/projects/useProjects";
import { useCategories } from "@/features/categories/useCategories";
import { useQueryParams } from "@/hooks/useQueryParams";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT } from "@/store/i18n";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { SegmentedControl } from "@/components/ui/Tabs";
import { ProjectFiltersBar } from "@/features/projects/ProjectFiltersBar";
import { OwnerProjectsTable } from "@/features/projects/OwnerProjectsTable";
import { BrowseProjects } from "@/features/projects/BrowseProjects";
import { ProjectForm } from "@/features/projects/ProjectForm";
import { filterProjects, paginate, sortProjects } from "@/entities/project/metrics";
import type { ProjectFilters } from "@/types";

type ViewMode = "table" | "grid";

function IconList() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
      />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function getRolePrefix(role?: string): string {
  if (role === "OWNER") return "/owner";
  if (role === "ADMIN") return "/admin";
  return "/freelancer";
}

function getProjectsPageDescription(role: string | undefined, isOwner: boolean, t: (k: string) => string): string {
  if (isOwner) return t("projects.subtitle");
  if (role === "FREELANCER") return t("dashboard.recommendationsHint");
  return t("analytics.subtitle");
}

function useProjectsPageData(isOwner: boolean) {
  const ownerQuery = useOwnerProjects({});
  const publishedQuery = useProjects({ status: "OPEN" });

  const activeQuery = isOwner ? ownerQuery : publishedQuery;

  return {
    source: activeQuery.projects,
    isLoading: activeQuery.isLoading,
    error: activeQuery.error,
    isFetching: activeQuery.isFetching,
    refetch: activeQuery.refetch,
  };
}

/**
 * Projects catalogue and management surface.
 */
function ProjectsPage() {
  const { t } = useT();
  const { user, isLoading: userLoading } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const [creating, setCreating] = useState(searchParams.get("new") === "1");

  const role = user?.role;
  const isOwner = role === "OWNER";
  const isAdmin = role === "ADMIN";
  const prefix = getRolePrefix(role);

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
  const { source, isLoading: dataLoading, error, isFetching, refetch } = useProjectsPageData(isOwner);
  const isLoading = userLoading || dataLoading;

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

  const handleCloseModal = () => {
    setCreating(false);
    if (searchParams.get("new")) {
      const next = new URLSearchParams(searchParams);
      next.delete("new");
      setSearchParams(next, { replace: true });
    }
  };

  return (
    <div>
      <PageHeader
        title={isOwner ? t("projects.myTitle") : t("projects.listTitle")}
        description={getProjectsPageDescription(role, isOwner, t)}
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
                value: String(option.value),
              }))
        }
        activeCount={params.activeCount}
        onChange={(patch) => params.set(patch)}
        onReset={params.reset}
        onRefresh={refetch}
        isFetching={isFetching}
      />

      {viewMode === "grid" ? (
        <BrowseProjects
          projects={filtered}
          user={user}
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
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
            onRetry={refetch}
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
        onClose={handleCloseModal}
        title={t("projects.create")}
        size="lg">
        <ProjectForm
          categories={categories.options}
          onClose={handleCloseModal}
        />
      </Modal>

      <span className="sr-only">{prefix}</span>
    </div>
  );
}

export default ProjectsPage;
