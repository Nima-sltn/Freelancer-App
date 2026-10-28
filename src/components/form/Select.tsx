import type { ChangeEvent, ReactNode } from "react";
import type { FieldErrors, FieldValues, Path, RegisterOptions, UseFormRegister } from "react-hook-form";
import { FormField, useFieldAria } from "./FormField";
import { useT } from "@/store/i18n";
import { cx } from "@/lib/cx";
import type { SelectOption } from "@/types";

interface BaseOption {
  value: string | number;
  label: string;
}

/** Plain, design-system styled `<select>`. */
export function Select<T extends BaseOption>({
  value,
  onChange,
  options,
  className,
  ariaLabel,
  placeholder,
  disabled,
}: {
  value: T["value"];
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  options: readonly T[];
  className?: string;
  ariaLabel?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={onChange}
      aria-label={ariaLabel}
      disabled={disabled}
      className={cx("field-input py-2.5", className)}>
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export interface RHFSelectProps<T extends FieldValues> {
  name: Path<T>;
  label?: ReactNode;
  register: UseFormRegister<T>;
  errors?: FieldErrors<T>;
  rules?: RegisterOptions<T, Path<T>>;
  options: Array<SelectOption<string | number>>;
  placeholder?: string;
  required?: boolean;
  hint?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/** RHF-bound select with a placeholder option and validation display. */
export function RHFSelect<T extends FieldValues>({
  name,
  label,
  register,
  errors,
  rules,
  options,
  placeholder,
  required,
  hint,
  disabled,
  className,
}: RHFSelectProps<T>) {
  const { t } = useT();
  const error = errors?.[name]?.message as string | undefined;
  const aria = useFieldAria(name, { hasError: Boolean(error), hasHint: Boolean(hint) });

  return (
    <FormField
      name={name}
      label={label}
      required={required}
      hint={hint}
      error={error}
      className={className}>
      <select
        id={name}
        disabled={disabled}
        aria-invalid={aria.invalid}
        aria-describedby={aria.describedBy}
        className="field-input"
        {...register(name, rules)}>
        <option value="">{placeholder ?? t("common.select")}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}

export default Select;
