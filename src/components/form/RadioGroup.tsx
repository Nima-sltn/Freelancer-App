import type { FieldErrors, FieldValues, Path, RegisterOptions, UseFormRegister, UseFormWatch } from "react-hook-form";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

export interface RadioOption {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
  readonly icon?: ReactNode;
}

export interface RadioGroupProps<T extends FieldValues> {
  readonly name: Path<T>;
  readonly options: readonly RadioOption[];
  readonly register: UseFormRegister<T>;
  readonly watch: UseFormWatch<T>;
  readonly errors?: FieldErrors<T>;
  readonly rules?: RegisterOptions<T, Path<T>>;
  readonly label?: ReactNode;
  /** Renders options as selectable cards instead of inline radios. */
  readonly variant?: "inline" | "cards";
  readonly required?: boolean;
  readonly className?: string;
}

/**
 * Radio group with two presentations.
 *
 * Implemented with real `<input type="radio">` inside a `fieldset`/`legend`, so
 * arrow-key navigation and screen-reader announcement come for free — the
 * previous implementation used a bare `<input>` with a manual `<label htmlFor>`
 * and lost the group semantics.
 */
export function RadioGroup<T extends FieldValues>({
  name,
  options,
  register,
  watch,
  errors,
  rules,
  label,
  variant = "inline",
  required,
  className,
}: Readonly<RadioGroupProps<T>>) {
  const error = errors?.[name]?.message as string | undefined;
  const current = watch(name);

  return (
    <fieldset className={cx("w-full", className)}>
      {label ? (
        <legend className="field-label">
          {label}
          {required ? (
            <span className="text-danger" aria-hidden="true">
              {" "}
              *
            </span>
          ) : null}
        </legend>
      ) : null}

      <div
        className={cx(
          variant === "cards" ? "grid gap-3 sm:grid-cols-2" : "flex flex-wrap items-center gap-x-6 gap-y-3"
        )}>
        {options.map((option) => {
          const id = `${name}-${option.value}`;
          const checked = current === option.value;

          return (
            <label
              key={option.value}
              htmlFor={id}
              className={cx(
                "flex cursor-pointer items-start gap-3 text-sm text-ink-soft",
                variant === "cards" &&
                  cx(
                    "rounded-card border p-3.5 transition-all duration-200",
                    checked
                      ? "border-primary-500 bg-primary-500/5 ring-1 ring-primary-500/40"
                      : "border-line hover:border-line-strong hover:bg-surface-sunken"
                  )
              )}>
              <input
                type="radio"
                id={id}
                value={option.value}
                className="mt-1 h-4 w-4 cursor-pointer form-radio text-primary-600 focus:ring-primary-500"
                {...register(name, rules)}
              />
              <span className="flex flex-col gap-1">
                <span className="flex items-center gap-2 font-bold text-ink">
                  {option.icon}
                  {option.label}
                </span>
                {option.description ? (
                  <span className="text-xs leading-6 text-ink-muted">{option.description}</span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>

      {error ? (
        <p role="alert" className="field-error">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

export default RadioGroup;
