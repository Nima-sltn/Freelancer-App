import { TagsInput } from "react-tag-input-component";
import type { ReactNode } from "react";
import { useT } from "@/store/i18n";
import { FormField } from "./FormField";

interface TagInputProps {
  label?: ReactNode;
  name: string;
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  maxTags?: number;
  className?: string;
}

/**
 * Tag editor with a suggestion list.
 *
 * Wraps `react-tag-input-component` (already themed through CSS variables in
 * `index.css`) and adds the design-system label/hint/error chrome.
 */
export function TagInput({
  label,
  name,
  value,
  onChange,
  placeholder,
  hint,
  error,
  required,
  maxTags = 8,
  className,
}: TagInputProps) {
  const { t } = useT();
  const displayPlaceholder = placeholder ?? t("field.tagPlaceholder");

  const handleChange = (tags: string[]) => {
    onChange(tags.slice(0, maxTags).map((tag) => tag.trim()).filter(Boolean));
  };

  return (
    <FormField
      name={name}
      label={label}
      required={required}
      hint={hint}
      error={error}
      className={className}>
      <TagsInput
        value={value}
        onChange={handleChange}
        name={name}
        placeHolder={displayPlaceholder}
      />
      <p className="mt-1.5 text-end text-xs text-ink-muted">
        {value.length}/{maxTags}
      </p>
    </FormField>
  );
}

export default TagInput;
