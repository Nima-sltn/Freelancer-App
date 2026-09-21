import { TagsInput } from "react-tag-input-component";
import RHFSelect from "../../ui/RHFSelect";
import TextField from "./../../ui/TextField";
import { useForm } from "react-hook-form";
import { useState } from "react";
import DatePickerField from "../../ui/DatePickerField";
import useCategories from "../../hooks/useCategories";
import useCreateProject from "./useCreateProject";
import Loading from "./../../ui/Loading";
import useEditProject from "./useEditProject";
import type { Project } from "../../types";

interface CreateProjectFormProps {
  onClose: () => void;
  projectToEdit?: Partial<Project>;
}

function CreateProjectForm({ onClose, projectToEdit = {} }: CreateProjectFormProps) {
  const { _id: editId } = projectToEdit;
  const isEditSession = Boolean(editId);

  const {
    title,
    description,
    budget,
    category,
    deadline,
    tags: prevTags,
  } = projectToEdit as any;

  let editValues: Record<string, any> = {};

  if (isEditSession) {
    editValues = {
      title,
      description,
      budget,
      captureEvents: category?._id,
    };
  }
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: editValues });

  const [tags, setTags] = useState<string[]>(prevTags || []);
  const [date, setDate] = useState(new Date(deadline || ""));
  const { categories } = useCategories();
  const { createProject, isCreating } = useCreateProject();
  const { editProject, isEditing } = useEditProject();

  const onSubmit = (data: any) => {
    const newProject = {
      ...data,
      deadline: new Date(date).toISOString(),
      tags,
    };

    if (isEditSession) {
      editProject(
        { editId: editId!, id: editId!, newProject },
        {
          onSuccess: () => {
            onClose();
            reset();
          },
        }
      );
    } else {
      createProject(newProject, {
        onSuccess: () => {
          onClose();
          reset();
        },
      });
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
      <TextField
        label="عنوان پروژه"
        name="title"
        register={register}
        required
        validationSchema={{
          required: "عنوان ضروری است",
          minLength: {
            value: 10,
            message: "حداقل ۱۰ کاراکتر را وارد کنید",
          },
        }}
        errors={errors}
      />
      <TextField
        label="توضیحات"
        name="description"
        register={register}
        required
        validationSchema={{
          required: "توضیحات ضروری است",
          minLength: {
            value: 15,
            message: "حداقل ۱۵ کاراکتر را وارد کنید",
          },
        }}
        errors={errors}
      />
      <TextField
        label="بودجه"
        name="budget"
        register={register}
        required
        validationSchema={{
          required: "بودجه ضروری است",
        }}
        errors={errors}
      />
      <RHFSelect
        label="دسته بندی"
        name="category"
        required
        register={register}
        options={categories}
      />
      <div>
        <label className="mb-1 block text-secondary-700">تگ</label>
        <TagsInput value={tags} onChange={setTags} name="tags" />
      </div>
      <DatePickerField date={date} setDate={setDate} label="ددلاین" />
      <div className="mt-8">
        {isCreating || isEditing ? (
          <Loading />
        ) : (
          <button
            className="btn btn--primary w-2/3 -translate-x-1/4"
            type="submit">
            تایید
          </button>
        )}
      </div>
    </form>
  );
}

export default CreateProjectForm;
