import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

/**
 * Shared field chrome: label, required marker, hint and error.
 *
 * `useFieldAria` gives every control the matching `id`/`aria-describedby` pair,
 * which is how the forms stay screen-reader friendly without repeating ARIA
 * attributes in a dozen components.
 */
export function useFieldAria(
  name: string,
  options: { hasError?: boolean; hasHint?: boolean } = {}
): { id: string; describedBy?: string; invalid: boolean } {
  const { hasError = false, hasHint = false } = options;
  const descriptions = [
    hasHint ? `${name}-hint` : null,
    hasError ? `${name}-error` : null,
  ].filter(Boolean) as string[];

  return {
    id: name,
    describedBy: descriptions.length > 0 ? descriptions.join(" ") : undefined,
    invalid: hasError,
  };
}

export interface FormFieldProps {
  readonly name: string;
  readonly label?: ReactNode;
  readonly required?: boolean;
  readonly hint?: ReactNode;
  readonly error?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}

export function FormField({
  name,
  label,
  required,
  hint,
  error,
  children,
  className,
}: Readonly<FormFieldProps>) {
  return (
    <div className={cx("w-full", className)}>
      {label ? (
        <label className="field-label" htmlFor={name}>
          {label}
          {required ? (
            <span className="text-danger" aria-hidden="true">
              {" "}
              *
            </span>
          ) : null}
        </label>
      ) : null}

      {children}

      {hint && !error ? (
        <p id={`${name}-hint`} className="mt-1.5 text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={`${name}-error`} role="alert" className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default FormField;
