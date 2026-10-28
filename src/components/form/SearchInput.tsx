import { useEffect, useState } from "react";
import { HiOutlineSearch, HiX } from "react-icons/hi";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useT } from "@/store/i18n";
import { cx } from "@/lib/cx";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
  autoFocus?: boolean;
  ariaLabel?: string;
}

/**
 * Debounced search box.
 *
 * Keeps a local draft so typing stays instant while the expensive part (URL
 * update + refetch) is debounced, and exposes a clear button for touch users.
 */
export function SearchInput({
  value,
  onChange,
  placeholder,
  debounceMs = 350,
  className,
  autoFocus,
  ariaLabel,
}: SearchInputProps) {
  const { t } = useT();
  const [draft, setDraft] = useState(value);
  const debounced = useDebouncedValue(draft, debounceMs);

  const resolvedPlaceholder = placeholder ?? t("common.searchPlaceholder");
  const resolvedAriaLabel = ariaLabel ?? t("common.search");

  useEffect(() => {
    if (debounced !== value) onChange(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <div className={cx("relative w-full", className)}>
      <HiOutlineSearch
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-ink-muted"
      />
      <input
        type="search"
        value={draft}
        autoFocus={autoFocus}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={resolvedPlaceholder}
        aria-label={resolvedAriaLabel}
        className="field-input ps-9 pe-9"
      />
      {draft ? (
        <button
          type="button"
          onClick={() => {
            setDraft("");
            onChange("");
          }}
          aria-label={t("common.clearFilters")}
          className="absolute inset-y-0 end-2 my-auto grid h-6 w-6 place-items-center rounded-md text-ink-muted hover:bg-surface-sunken hover:text-ink">
          <HiX className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

export default SearchInput;
