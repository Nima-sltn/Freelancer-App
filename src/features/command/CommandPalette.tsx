import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogPanel } from "@headlessui/react";
import { Kbd } from "@/components/ui/Badge";
import { IconSearch } from "@/components/ui/icons";
import { useCommandPalette } from "@/store/command";
import { useT } from "@/store/i18n";
import { highlightMatches } from "@/lib/format/text";
import { cx } from "@/lib/cx";
import { rankCommands } from "./useGlobalCommands";

const GROUP_LABEL: Record<string, string> = {
  navigation: "command.group.navigation",
  actions: "command.group.actions",
  projects: "command.group.projects",
  settings: "command.group.settings",
};

/**
 * Command palette (Ctrl/⌘+K).
 *
 * Implements the full keyboard contract: fuzzy search, arrow navigation with a
 * wrapping cursor, Enter to run, Escape to dismiss and a scroll-into-view for the
 * active row. It is also the fastest way to demonstrate the app's architecture —
 * every registered command proves a feature exposed its actions declaratively.
 */
export function CommandPalette() {
  const { t } = useT();
  const { isOpen, close, commands, runCommand } = useCommandPalette();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => rankCommands(commands, query).slice(0, 40), [commands, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof results>();
    results.forEach((command) => {
      const bucket = map.get(command.group) ?? [];
      bucket.push(command);
      map.set(command.group, bucket);
    });
    return [...map.entries()];
  }, [results]);

  const flat = useMemo(() => grouped.flatMap(([, items]) => items), [grouped]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setCursor(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const active = listRef.current?.querySelector<HTMLElement>("[data-active='true']");
    active?.scrollIntoView({ block: "nearest" });
  }, [cursor, isOpen]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((value) => (flat.length === 0 ? 0 : (value + 1) % flat.length));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((value) => (flat.length === 0 ? 0 : (value - 1 + flat.length) % flat.length));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const command = flat[cursor];
      if (command) runCommand(command.id);
    }
  };

  let runningIndex = -1;

  return (
    <Dialog open={isOpen} onClose={close} className="relative z-[60]" aria-label={t("command.title")}>
      <div className="fixed inset-0 animate-fade-in bg-ink/50 backdrop-blur-sm" />

      <div className="fixed inset-0 flex items-start justify-center p-4 pt-[12vh]">
        <DialogPanel className="w-full max-w-xl animate-slide-up overflow-hidden rounded-card border border-line bg-surface shadow-pop">
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            <IconSearch aria-hidden="true" className="h-5 w-5 text-ink-muted" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t("command.placeholder")}
              aria-label={t("command.title")}
              aria-controls="command-results"
              className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
            />
            <Kbd>Esc</Kbd>
          </div>

          <ul
            id="command-results"
            ref={listRef}
            className="max-h-[52vh] overflow-y-auto p-2">
            {flat.length === 0 ? (
              <li className="px-3 py-8 text-center text-sm text-ink-muted">
                {t("command.noResults")}
              </li>
            ) : (
              grouped.map(([group, items]) => (
                <li key={group}>
                  <p className="px-3 pb-1 pt-3 text-[0.65rem] font-black uppercase tracking-wide text-ink-muted">
                    {t(GROUP_LABEL[group] ?? "command.group.actions")}
                  </p>
                  <ul>
                    {items.map((command) => {
                      runningIndex += 1;
                      const index = runningIndex;
                      const isActive = index === cursor;
                      const segments = highlightMatches(command.label, query);
                      let segmentOffset = 0;

                      return (
                        <li key={command.id} role="option" aria-selected={isActive}>
                          <button
                            type="button"
                            data-active={isActive}
                            onMouseEnter={() => setCursor(index)}
                            onClick={() => runCommand(command.id)}
                            className={cx(
                              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start transition-colors",
                              isActive ? "bg-primary-600 text-white" : "text-ink-soft hover:bg-surface-sunken"
                            )}>
                            <span aria-hidden="true" className="text-lg">
                              {command.icon}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-sm font-bold">
                              {segments.map((segment) => {
                                const segKey = `${command.id}-${segmentOffset}`;
                                segmentOffset += segment.text.length;
                                return (
                                  <span
                                    key={segKey}
                                    className={segment.match ? "underline decoration-2" : undefined}>
                                    {segment.text}
                                  </span>
                                );
                              })}
                            </span>
                            {command.hint ? (
                              <span className="hidden shrink-0 truncate text-xs opacity-70 sm:inline">
                                {command.hint}
                              </span>
                            ) : null}
                            {command.shortcut ? <Kbd>{command.shortcut}</Kbd> : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))
            )}
          </ul>

          <footer className="flex items-center justify-between gap-3 border-t border-line px-4 py-2 text-[0.7rem] text-ink-muted">
            <span className="flex items-center gap-2">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              {t("common.next")}
              <Kbd>Enter</Kbd>
            </span>
            <span>{t("command.hint")}</span>
          </footer>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

export default CommandPalette;
