import type { FieldErrors, FieldValues, Path, RegisterOptions, UseFormRegister } from "react-hook-form";
import type { ReactNode } from "react";
import { FormField, useFieldAria } from "./FormField";
import { cx } from "@/lib/cx";

export interface TextFieldProps<T extends FieldValues> {
  readonly name: Path<T>;
  readonly label?: ReactNode;
  readonly register: UseFormRegister<T>;
  readonly errors?: FieldErrors<T>;
  readonly rules?: RegisterOptions<T, Path<T>>;
  readonly type?: "text" | "email" | "tel" | "number" | "password" | "url";
  readonly placeholder?: string;
  readonly hint?: ReactNode;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly autoComplete?: string;
  readonly inputMode?: "text" | "numeric" | "tel" | "email" | "decimal";
  readonly leadingIcon?: ReactNode;
  readonly trailingIcon?: ReactNode;
  /** Renders a numeric input with digit grouping and latin/persian handling. */
  readonly multiline?: boolean;
  readonly rows?: number;
  readonly className?: string;
}

/**
 * Text input wired to React Hook Form.
 *
 * Validation rules live next to the field (instead of in a separate schema
 * nobody remembers to update) and the base field classes come from the design
 * system, so every input in the app looks and behaves identically.
 */
export function TextField<T extends FieldValues>({
  name,
  label,
  register,
  errors,
  rules,
  type = "text",
  placeholder,
  hint,
  required,
  disabled,
  autoComplete = "off",
  inputMode,
  leadingIcon,
  trailingIcon,
  multiline,
  rows = 4,
  className,
}: Readonly<TextFieldProps<T>>) {
  const error = errors?.[name]?.message as string | undefined;
  const aria = useFieldAria(name, { hasError: Boolean(error), hasHint: Boolean(hint) });

  const controlClasses = cx(
    "field-input",
    leadingIcon && "ps-10",
    trailingIcon && "pe-10",
    multiline && "min-h-28 resize-y leading-7"
  );

  return (
    <FormField
      name={name}
      label={label}
      required={required}
      hint={hint}
      error={error}
      className={className}>
      <div className="relative">
        {leadingIcon ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 start-3 grid place-items-center text-ink-muted">
            {leadingIcon}
          </span>
        ) : null}

        {multiline ? (
          <textarea
            id={name}
            rows={rows}
            placeholder={placeholder}
            disabled={disabled}
            aria-invalid={aria.invalid}
            aria-describedby={aria.describedBy}
            className={controlClasses}
            {...register(name, rules)}
          />
        ) : (
          <input
            id={name}
            type={type}
            inputMode={inputMode}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete={autoComplete}
            aria-invalid={aria.invalid}
            aria-describedby={aria.describedBy}
            className={controlClasses}
            {...register(name, rules)}
          />
        )}

        {trailingIcon ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 end-3 grid place-items-center text-ink-muted">
            {trailingIcon}
          </span>
        ) : null}
      </div>
    </FormField>
  );
}

export default TextField;
