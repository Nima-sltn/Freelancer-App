import { useState } from "react";
import { useForm } from "react-hook-form";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { TextField } from "@/components/form";
import { SkeletonText } from "@/components/ui/Skeleton";
import { useCategories, useCategoryMutations } from "@/features/categories/useCategories";
import { useT } from "@/store/i18n";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { formatCurrency, formatNumber } from "@/lib/format/numbers";
import { IconCollection, IconEdit, IconPlus, IconTrash } from "@/components/ui/icons";
import type { Category } from "@/types";

interface CategoryFormValues {
  title: string;
  englishTitle: string;
}

function CategoryForm({
  category,
  onClose,
}: {
  category?: Category;
  onClose: () => void;
}) {
  const { t } = useT();
  const { create, update } = useCategoryMutations();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    defaultValues: {
      title: category?.title ?? "",
      englishTitle: category?.englishTitle ?? "",
    },
  });

  const submit = handleSubmit((values) => {
    if (category) {
      update.mutate({ id: category._id, data: values }, { onSuccess: onClose });
      return;
    }
    create.mutate(values, { onSuccess: onClose });
  });

  return (
    <form className="space-y-5" onSubmit={submit}>
      <TextField<CategoryFormValues>
        name="title"
        label={t("field.title")}
        register={register}
        errors={errors}
        required
        rules={{ required: t("validation.required") }}
      />
      <TextField<CategoryFormValues>
        name="englishTitle"
        label="English title"
        register={register}
        errors={errors}
        required
        hint={t("categories.slugHint")}
        rules={{ required: t("validation.required") }}
      />
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" isLoading={create.isPending || update.isPending}>
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}

/** Category management with live usage statistics per category. */
function CategoriesPage() {
  const { t } = useT();
  const { categories, isLoading } = useCategories();
  const { remove } = useCategoryMutations();
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Category | null>(null);
  useDocumentTitle(t("categories.title"));

  return (
    <div>
      <PageHeader
        title={t("categories.title")}
        description={t("categories.subtitle")}
        icon={<IconCollection />}
        actions={
          <Button leadingIcon={<IconPlus />} size="sm" onClick={() => setCreating(true)}>
            {t("categories.create")}
          </Button>
        }
      />

      {isLoading ? (
        <Card>
          <SkeletonText lines={5} />
        </Card>
      ) : categories.length === 0 ? (
        <Card className="text-center text-sm text-ink-muted">{t("categories.empty")}</Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <li key={category._id}>
              <Card className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-black text-ink">
                      {category.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-ink-muted">{category.englishTitle}</p>
                  </div>
                  <span aria-hidden="true" className="text-2xl">
                    {category.icon ?? "🗂️"}
                  </span>
                </div>

                <dl className="mt-4 flex-1 space-y-1.5 text-xs text-ink-soft">
                  <div className="flex items-center justify-between">
                    <dt>{t("field.projects")}</dt>
                    <dd className="font-bold tabular-nums">
                      {formatNumber(category.openProjects ?? 0)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>{t("stats.averageBudget")}</dt>
                    <dd className="font-bold tabular-nums">
                      {formatCurrency(category.averageBudget ?? 0, { compact: true })}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                  <Badge tone="neutral">{t("categories.projectCount", { count: category.openProjects ?? 0 })}</Badge>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      aria-label={t("common.edit")}
                      onClick={() => setEditing(category)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft hover:bg-surface-sunken">
                      <IconEdit className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={t("common.delete")}
                      onClick={() => setDeleting(category)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-danger hover:bg-danger/10">
                      <IconTrash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal isOpen={creating} onClose={() => setCreating(false)} title={t("categories.create")}>
        <CategoryForm onClose={() => setCreating(false)} />
      </Modal>

      <Modal isOpen={Boolean(editing)} onClose={() => setEditing(null)} title={t("common.edit")}>
        {editing ? <CategoryForm category={editing} onClose={() => setEditing(null)} /> : null}
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={t("common.delete")}
        message={deleting?.title ?? ""}
        tone="danger"
        isLoading={remove.isPending}
        onConfirm={() => {
          if (!deleting) return;
          remove.mutate(deleting._id, { onSettled: () => setDeleting(null) });
        }}
      />
    </div>
  );
}

export default CategoriesPage;
