import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/form";
import { useT } from "@/store/i18n";
import { isIranianMobile, normalizePhone } from "@/lib/validators";
import { IconMobile } from "@/components/ui/icons";

export interface PhoneFormValues {
  phoneNumber: string;
}

export interface PhoneFormProps {
  readonly onSubmit: (phoneNumber: string) => void;
  readonly isPending: boolean;
}

/** Step 1 of sign-in: collect and validate the mobile number. */
export function PhoneForm({
  onSubmit,
  isPending,
}: Readonly<PhoneFormProps>) {
  const { t } = useT();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PhoneFormValues>({ defaultValues: { phoneNumber: "" } });

  return (
    <form
      className="space-y-6"
      noValidate
      onSubmit={handleSubmit((values) => onSubmit(normalizePhone(values.phoneNumber)))}>
      <TextField<PhoneFormValues>
        name="phoneNumber"
        label={t("field.phone")}
        register={register}
        errors={errors}
        type="tel"
        inputMode="tel"
        required
        autoComplete="tel"
        placeholder="09123456789"
        leadingIcon={<IconMobile className="h-4 w-4" />}
        hint={t("auth.subtitle")}
        rules={{
          required: t("validation.required"),
          validate: (value) => isIranianMobile(String(value)) || t("validation.phone.invalid"),
        }}
      />

      <Button type="submit" fullWidth isLoading={isPending} size="lg">
        {t("auth.sendCode")}
      </Button>
    </form>
  );
}

export default PhoneForm;
