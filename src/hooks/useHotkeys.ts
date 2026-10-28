import { useEffect, useRef } from "react";

export interface HotkeyDefinition {
  /** Lower-case key name, e.g. "k", "enter", "escape" or "?" */
  key: string;
  /** Require Meta (macOS) or Control. */
  mod?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: (event: KeyboardEvent) => void;
  /** Fire even while typing inside an input/textarea. Defaults to false. */
  allowInInput?: boolean;
  enabled?: boolean;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    target.isContentEditable ||
    target.getAttribute("role") === "textbox"
  );
}

/**
 * Registers global keyboard shortcuts.
 *
 * The previous codebase had none; every action now has a discoverable key
 * binding (see `docs/keyboard-shortcuts.md`) which is a large accessibility and
 * power-user win.
 */
export function useHotkeys(definitions: HotkeyDefinition[], deps: unknown[] = []): void {
  const ref = useRef(definitions);
  ref.current = definitions;

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      for (const definition of ref.current) {
        if (definition.enabled === false) continue;

        const eventKey = event.key.toLowerCase();
        if (eventKey !== definition.key.toLowerCase()) continue;

        const wantsMod = Boolean(definition.mod);
        const hasMod = event.metaKey || event.ctrlKey;
        if (wantsMod !== hasMod) continue;
        if (Boolean(definition.shift) !== event.shiftKey && definition.key !== "?") continue;
        if (Boolean(definition.alt) !== event.altKey) continue;
        if (!definition.allowInInput && isEditableTarget(event.target)) continue;

        event.preventDefault();
        definition.handler(event);
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export default useHotkeys;
