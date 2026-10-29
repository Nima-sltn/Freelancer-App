import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useHotkeys } from "@/hooks/useHotkeys";
import { useTheme } from "@/store/theme";
import { useI18n } from "@/store/i18n";
import { useTransactions } from "@/store/transaction";

/**
 * Application-wide shortcuts.
 *
 * Documented in the settings page and in `docs/keyboard-shortcuts.md`. Every one
 * of them is also reachable from the command palette, so nothing is
 * keyboard-only in the sense of being undiscoverable.
 */
export function useGlobalHotkeys(): void {
  const navigate = useNavigate();
  const { toggleDarkMode } = useTheme();
  const { toggleLocale, t } = useI18n();
  const { undo, pendingCount } = useTransactions();

  useHotkeys([
    {
      key: "d",
      shift: true,
      handler: toggleDarkMode,
    },
    {
      key: "l",
      shift: true,
      handler: toggleLocale,
    },
    {
      key: "z",
      mod: true,
      handler: () => {
        if (pendingCount > 0) {
          toast(t("tx.undoLast"), { icon: "↩️" });
        }
        undo();
      },
    },
    {
      key: "/",
      handler: () => {
        const search = document.querySelector<HTMLInputElement>('input[type="search"]');
        search?.focus();
      },
    },
    {
      key: "?",
      shift: true,
      handler: () => navigate("/not-authorized"),
    },
  ]);
}

export default useGlobalHotkeys;
