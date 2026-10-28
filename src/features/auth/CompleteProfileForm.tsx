import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { ROLE_HOME } from "@/config/constants";
import { queryKeys } from "@/config/queryKeys";
import { authService } from "@/services";
import { useT } from "@/store/i18n";
import { ApiError } from "@/lib/http/errors";
import { Button } from "@/components/ui/Button";
import { TextField, RadioGroup } from "@/components/form";
import type { CompleteProfileData, UserRole } from "@/types";

interface FormValues extends CompleteProfileData {
  role: Extract<UserRole, "OWNER" | "FREELANCER">;
}

/** Collects the details the API cannot infer from a phone number. */
export function CompleteProfileForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useT();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { name: "", email: "", role: "OWNER" },
  });

  const { mutate: completeProfile, isPending } = useMutation({
    mutationFn: authService.completeProfile,
    onSuccess: (response) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.profile });
      toast.success(response.message);

      const user = response.user;
      if (user && Number(user.status) !== 2) {
        toast(t("auth.pendingApproval"), { icon: "⏳" });
        navigate("/", { replace: true });
        return;
      }
      navigate(user ? ROLE_HOME[user.role] : "/", { replace: true });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : t("common.errorHint"));
    },
  });

  return (
    <form className="space-y-6" noValidate onSubmit={handleSubmit((values) => completeProfile(values))}>
      <TextField<FormValues>
        name="name"
        label={t("field.name")}
        register={register}
        errors={errors}
        required
        rules={{ required: t("validation.name.min"), minLength: { value: 3, message: t("validation.name.min") } }}
      />
      <TextField<FormValues>
        name="email"
        label={t("field.email")}
        type="email"
        register={register}
        errors={errors}
        required
        rules={{
          required: t("validation.required"),
          pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, message: t("validation.email.invalid") },
        }}
      />

      <RadioGroup<FormValues>
        name="role"
        label={t("auth.chooseRole")}
        variant="cards"
        register={register}
        watch={watch}
        errors={errors}
        required
        rules={{ required: t("validation.role.required") }}
        options={[
          {
            value: "OWNER",
            label: t("landing.roleOwner"),
            description: t("auth.roleOwnerHint"),
            icon: <span aria-hidden="true">🏢</span>,
          },
          {
            value: "FREELANCER",
            label: t("landing.roleFreelancer"),
            description: t("auth.roleFreelancerHint"),
            icon: <span aria-hidden="true">🧑‍💻</span>,
          },
        ]}
      />

      <Button type="submit" fullWidth size="lg" isLoading={isPending}>
        {t("auth.verify")}
      </Button>
    </form>
  );
}

export default CompleteProfileForm;
