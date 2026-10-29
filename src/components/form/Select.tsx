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
}: Readonly<{
  readonly value: T["value"];
  readonly onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  readonly options: readonly T[];
  readonly className?: string;
  readonly ariaLabel?: string;
  readonly placeholder?: string;
  readonly disabled?: boolean;
}>) {
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
  readonly name: Path<T>;
  readonly label?: ReactNode;
  readonly register: UseFormRegister<T>;
  readonly errors?: FieldErrors<T>;
  readonly rules?: RegisterOptions<T, Path<T>>;
  readonly options: Array<SelectOption<string | number>>;
  readonly placeholder?: string;
  readonly required?: boolean;
  readonly hint?: ReactNode;
  readonly disabled?: boolean;
  readonly className?: string;
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
}: Readonly<RHFSelectProps<T>>) {
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
