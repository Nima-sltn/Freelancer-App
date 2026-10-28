import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CommandGroup = "navigation" | "actions" | "projects" | "settings";

export interface Command {
  id: string;
  label: string;
  group: CommandGroup;
  /** Extra searchable text (keywords, synonyms). */
  keywords?: string;
  icon?: ReactNode;
  shortcut?: string;
  /** Optional right-hand hint, e.g. the destination path. */
  hint?: string;
  perform: () => void;
}

export interface CommandContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  commands: Command[];
  registerCommands: (commands: Command[]) => () => void;
  runCommand: (id: string) => void;
}

const CommandContext = createContext<CommandContextValue | undefined>(undefined);

/**
 * Command palette registry.
 *
 * Features publish their own commands (with a cleanup function returned by
 * `registerCommands`) so the palette stays decoupled from the pages: adding a
 * new action anywhere in the app makes it globally reachable with Ctrl/⌘+K
 * without touching the palette component.
 */
export function CommandProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [registry, setRegistry] = useState<Record<string, Command>>({});

  const registerCommands = useCallback((commands: Command[]) => {
    setRegistry((current) => {
      const next = { ...current };
      commands.forEach((command) => {
        next[command.id] = command;
      });
      return next;
    });

    return () => {
      setRegistry((current) => {
        const next = { ...current };
        commands.forEach((command) => {
          delete next[command.id];
        });
        return next;
      });
    };
  }, []);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((value) => !value), []);

  const runCommand = useCallback(
    (id: string) => {
      const command = registry[id];
      if (!command) return;
      setIsOpen(false);
      command.perform();
    },
    [registry]
  );

  // Global Ctrl/⌘+K listener lives here so the palette works on every route.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggle]);

  const value = useMemo<CommandContextValue>(
    () => ({
      isOpen,
      open,
      close,
      toggle,
      commands: Object.values(registry),
      registerCommands,
      runCommand,
    }),
    [close, isOpen, open, registerCommands, registry, runCommand, toggle]
  );

  return <CommandContext.Provider value={value}>{children}</CommandContext.Provider>;
}

export function useCommandPalette(): CommandContextValue {
  const context = useContext(CommandContext);
  if (!context) throw new Error("useCommandPalette must be used inside <CommandProvider>");
  return context;
}

/** Registers commands for the lifetime of the calling component. */
export function useCommands(commands: Command[]): void {
  const { registerCommands } = useCommandPalette();
  const serialised = JSON.stringify(commands.map((command) => command.id));
  useEffect(() => {
    const unregister = registerCommands(commands);
    return unregister;
    // Re-register only when the command set changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialised, registerCommands]);
}

export default CommandProvider;
