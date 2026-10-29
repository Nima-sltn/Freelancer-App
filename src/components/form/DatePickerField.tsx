import DatePicker, { type DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import gregorian from "react-date-object/calendars/gregorian";
import gregorian_en from "react-date-object/locales/gregorian_en";
import type { ReactNode } from "react";
import { getActiveLocale } from "@/lib/locale";
import { formatRelative } from "@/lib/format/dates";
import { useT } from "@/store/i18n";
import { FormField } from "./FormField";

interface DatePickerFieldProps {
  readonly name: string;
  readonly label?: ReactNode;
  readonly value: Date | DateObject | string | null;
  readonly onChange: (date: Date) => void;
  readonly hint?: ReactNode;
  readonly error?: ReactNode;
  readonly required?: boolean;
  readonly className?: string;
  readonly minDate?: Date;
}

/**
 * Calendar input that follows the active locale: Jalali + Persian labels in
 * `fa`, Gregorian in `en`. This is a real cross-domain concern — dates are
 * stored as ISO strings and rendered per locale, so switching language never
 * changes the data, only its presentation.
 */
export function DatePickerField({
  name,
  label,
  value,
  onChange,
  hint,
  error,
  required,
  className,
  minDate,
}: Readonly<DatePickerFieldProps>) {
  const isFa = getActiveLocale() === "fa";
  const { t } = useT();
  const preview = value ? formatRelative(value as string) : null;

  return (
    <FormField
      name={name}
      label={label}
      required={required}
      hint={hint ?? (preview ? `${t("field.deadline")}: ${preview}` : undefined)}
      error={error}
      className={className}>
      <DatePicker
        id={name}
        value={value as DateObject}
        onChange={(date) => {
          if (!date) return;
          onChange(new Date((date as DateObject).toDate()));
        }}
        format={isFa ? "YYYY/MM/DD" : "DD/MM/YYYY"}
        calendar={isFa ? persian : gregorian}
        locale={isFa ? persian_fa : gregorian_en}
        calendarPosition="bottom-center"
        containerClassName="w-full"
        inputClass="field-input"
        minDate={minDate}
        editable={false}
      />
    </FormField>
  );
}

export default DatePickerField;
