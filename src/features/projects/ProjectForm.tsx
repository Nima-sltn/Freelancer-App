import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { TextField, RHFSelect, TagInput, DatePickerField } from "@/components/form";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { useT } from "@/store/i18n";
import { MIN_DESCRIPTION_LENGTH, MIN_TITLE_LENGTH, isFutureDate, parseNumeric } from "@/lib/validators";
import { formatCurrency } from "@/lib/format/numbers";
import type { CategoryOption, CreateProjectData, Project } from "@/types";
import useProjectMutations from "./useProjectMutations";

interface FormValues {
  title: string;
  description: string;
  budget: string;
  category: string;
}

/**
 * Create/edit project form.
 *
 * Replaces the previous version's several correctness bugs: the edit flow wrote
 * the category into an unrelated field (`captureEvents`), it never primed the
 * deadline, submitting an unchanged form produced "update failed" because
 * `modifiedCount` was 0, and the budget was sent as a string. Validation now
 * mirrors the backend Joi schema, so the client and server agree.
 */
export function ProjectForm({
  categories,
  projectToEdit,
  onClose,
}: {
  categories: CategoryOption[];
  projectToEdit?: Project;
  onClose: () => void;
}) {
  const { t } = useT();
  const { createProject, updateProject, isBusy } = useProjectMutations();
  const isEdit = Boolean(projectToEdit?._id);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      title: projectToEdit?.title ?? "",
      description: projectToEdit?.description ?? "",
      budget: projectToEdit?.budget ? String(projectToEdit.budget) : "",
      category: projectToEdit?.category?._id ?? "",
    },
  });

  const [tags, setTags] = useState<string[]>(projectToEdit?.tags ?? []);
  const [deadline, setDeadline] = useState<Date>(
    projectToEdit?.deadline ? new Date(projectToEdit.deadline) : new Date(Date.now() + 30 * 86_400_000)
  );

  const submit = handleSubmit((values) => {
    const budget = parseNumeric(values.budget);
    const payload: CreateProjectData = {
      title: values.title.trim(),
      description: values.description.trim(),
      budget,
      category: values.category,
      tags,
      deadline: deadline.toISOString(),
    };

    if (!isFutureDate(payload.deadline)) {
      toast.error(t("validation.deadline.future"));
      return;
    }

    if (isEdit && projectToEdit) {
      void updateProject(projectToEdit._id, payload, { onSuccess: onClose });
      return;
    }
    void createProject(payload, { onSuccess: onClose });
  });

  return (
    <form className="space-y-5" noValidate onSubmit={submit}>
      <TextField<FormValues>
        name="title"
        label={t("field.title")}
        register={register}
        errors={errors}
        required
        rules={{
          required: t("validation.required"),
          minLength: { value: MIN_TITLE_LENGTH, message: t("validation.title.min", { min: MIN_TITLE_LENGTH }) },
        }}
      />

      <TextField<FormValues>
        name="description"
        label={t("field.description")}
        register={register}
        errors={errors}
        required
        multiline
        rows={5}
        rules={{
          required: t("validation.required"),
          minLength: {
            value: MIN_DESCRIPTION_LENGTH,
            message: t("validation.description.min", { min: MIN_DESCRIPTION_LENGTH }),
          },
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField<FormValues>
          name="budget"
          label={t("field.budget")}
          register={register}
          errors={errors}
          required
          inputMode="numeric"
          hint={t("currency.toman") + " — " + formatCurrency(0, { withLabel: false })}
          rules={{
            required: t("validation.required"),
            validate: (value) => parseNumeric(String(value)) > 0 || t("validation.budget.positive"),
          }}
        />

        <RHFSelect<FormValues>
          name="category"
          label={t("field.category")}
          register={register}
          errors={errors}
          options={categories}
          required
          rules={{ required: t("validation.category.required") }}
        />
      </div>

      <TagInput
        name="tags"
        label={t("field.tags")}
        value={tags}
        onChange={setTags}
        hint={t("projects.skillsHint")}
      />

      <DatePickerField
        name="deadline"
        label={t("field.deadline")}
        value={deadline}
        onChange={setDeadline}
        required
        minDate={new Date()}
      />

      <Callout tone="info">
        {t("projects.openNotice")}
      </Callout>

      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" isLoading={isBusy}>
          {isEdit ? t("common.save") : t("projects.create")}
        </Button>
      </div>
    </form>
  );
}

export default ProjectForm;
