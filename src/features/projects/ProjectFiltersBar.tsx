import { SearchInput, Select } from "@/components/form";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { IconRefresh } from "@/components/ui/icons";
import { useT } from "@/store/i18n";
import { SORT_OPTIONS } from "@/config/constants";
import type { CategoryOption } from "@/types";

export interface ProjectFiltersBarProps {
  readonly search: string;
  readonly status: string;
  readonly sort: string;
  readonly category: string;
  readonly categories: readonly CategoryOption[];
  readonly activeCount: number;
  readonly onChange: (patch: Record<string, string | undefined>) => void;
  readonly onReset: () => void;
  readonly onRefresh?: () => void;
  readonly isFetching?: boolean;
}

/** Filter bar whose entire state lives in the URL (shareable, back-button safe). */
export function ProjectFiltersBar({
  search,
  status,
  sort,
  category,
  categories,
  activeCount,
  onChange,
  onReset,
  onRefresh,
  isFetching,
}: Readonly<ProjectFiltersBarProps>) {
  const { t } = useT();

  return (
    <div className="card mb-5 flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput
          value={search}
          onChange={(value) => onChange({ search: value || undefined })}
          placeholder={t("common.searchPlaceholder")}
          className="lg:max-w-md"
        />

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={status}
            onChange={(event) => onChange({ status: event.target.value, page: undefined })}
            options={[
              { value: "ALL", label: t("common.all") },
              { value: "OPEN", label: t("status.project.open") },
              { value: "CLOSED", label: t("status.project.closed") },
            ]}
            ariaLabel={t("common.status")}
            className="w-auto min-w-32 text-xs"
          />

          <Select
            value={category}
            onChange={(event) => onChange({ category: event.target.value, page: undefined })}
            options={[{ value: "ALL", label: `${t("field.category")} (${t("common.all")})` }, ...categories]}
            ariaLabel={t("field.category")}
            className="w-auto min-w-40 text-xs"
          />

          <Select
            value={sort}
            onChange={(event) => onChange({ sort: event.target.value })}
            options={SORT_OPTIONS.map((option): { value: string; label: string } => ({
              value: option.value,
              label: t(option.labelKey),
            }))}
            ariaLabel={t("common.sort")}
            className="w-auto min-w-40 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 lg:ms-auto">
          {onRefresh ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              leadingIcon={<IconRefresh className={isFetching ? "animate-spin" : undefined} />}>
              {t("common.refresh")}
            </Button>
          ) : null}
          {activeCount > 0 ? (
            <Button variant="outline" size="sm" onClick={onReset}>
              {t("common.clearFilters")}
            </Button>
          ) : null}
        </div>
      </div>

      {activeCount > 0 ? (
        <p className="flex items-center gap-2 text-xs text-ink-muted">
          <Badge tone="primary">{t("common.activeFilters", { count: activeCount })}</Badge>
        </p>
      ) : null}
    </div>
  );
}

export default ProjectFiltersBar;
