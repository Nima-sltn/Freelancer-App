import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCommands, type Command } from "@/store/command";
import { useT } from "@/store/i18n";
import { useTheme } from "@/store/theme";
import { useTransactions } from "@/store/transaction";
import { navItemsForRole } from "@/config/navigation";
import { IconFor } from "@/components/ui/IconFor";
import { env } from "@/config/env";
import { resetDemoData } from "@/mocks";
import { fuzzyScore } from "@/lib/format/text";
import type { Project, User } from "@/types";

/**
 * Command surface.
 *
 * Every navigation destination becomes a command automatically (the palette can
 * never fall out of sync with the sidebar) and the most valuable cross-cutting
 * actions — undo the last write, toggle dark mode, switch language, reset demo
 * data — are exposed as verbs. Projects are added as dynamic targets so the
 * palette doubles as a global quick-open.
 */
export function useGlobalCommands({
  user,
  projects = [],
}: {
  user: User | undefined;
  projects?: Project[];
}) {
  const { t } = useT();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { toggleDarkMode } = useTheme();
  const { undo, entries, pendingCount } = useTransactions();

  const commands = useMemo<Command[]>(() => {
    const list: Command[] = [];

    navItemsForRole(user?.role).forEach((item) => {
      list.push({
        id: `nav:${item.to}`,
        label: t(item.labelKey),
        group: "navigation",
        keywords: `${item.segment} ${item.labelKey}`,
        icon: <IconFor name={item.icon} />,
        hint: item.to,
        perform: () => navigate(item.to),
      });
    });

    list.push(
      {
        id: "action:theme",
        label: t("command.action.toggleTheme"),
        group: "settings",
        keywords: "dark light theme appearance رنگ تم",
        shortcut: "Shift+D",
        icon: <span aria-hidden="true">🌓</span>,
        perform: toggleDarkMode,
      },
      {
        id: "action:undo",
        label: t("command.action.undo"),
        group: "actions",
        keywords: "undo rollback revert بازگردانی",
        shortcut: "⌘Z",
        icon: <span aria-hidden="true">↩️</span>,
        hint: `${entries.length}`,
        perform: () => void undo(),
      },
      {
        id: "action:create-project",
        label: t("command.action.createProject"),
        group: "actions",
        keywords: "new project create ایجاد پروژه",
        icon: <span aria-hidden="true">➕</span>,
        perform: () => navigate("/owner/projects?new=1"),
      },
      {
        id: "action:board",
        label: t("nav.board"),
        group: "navigation",
        keywords: "kanban pipeline board تخته",
        icon: <span aria-hidden="true">🗂️</span>,
        perform: () => navigate("/freelancer/board"),
      }
    );

    if (env.useMocks) {
      list.push({
        id: "action:reset-demo",
        label: t("command.action.resetDemo"),
        group: "settings",
        keywords: "demo reset seed داده نمایشی",
        icon: <span aria-hidden="true">🧪</span>,
        perform: () => {
          resetDemoData();
          window.location.reload();
        },
      });
    }

    projects.slice(0, 40).forEach((project) => {
      const prefix = user?.role === "FREELANCER" ? "/freelancer" : user?.role === "ADMIN" ? "/admin" : "/owner";
      list.push({
        id: `project:${project._id}`,
        label: project.title,
        group: "projects",
        keywords: `${project.category?.title ?? ""} ${project.tags?.join(" ") ?? ""}`,
        icon: <span aria-hidden="true">📁</span>,
        hint: project.status === "OPEN" ? t("status.project.open") : t("status.project.closed"),
        perform: () => navigate(`${prefix}/projects/${project._id}`),
      });
    });

    // Boost the surrounding context so the most likely commands rank first.
    return list.map((command) => ({
      ...command,
      keywords: `${command.keywords ?? ""} ${pathname.includes(command.hint ?? "") ? "current" : ""}`,
    }));
  }, [entries.length, navigate, pathname, projects, t, toggleDarkMode, undo, user?.role]);

  useCommands(commands);

  return { commands, pendingCount };
}

/** Ranked search used by the palette; exported so it can be unit tested. */
export function rankCommands(commands: Command[], query: string): Command[] {
  if (!query.trim()) {
    return [...commands].sort((a, b) => a.group.localeCompare(b.group));
  }
  return commands
    .map((command) => ({
      command,
      score: Math.max(
        fuzzyScore(query, command.label),
        fuzzyScore(query, command.keywords ?? "") * 0.7
      ),
    }))
    .filter((entry) => entry.score > 0.15)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.command);
}

export default useGlobalCommands;
