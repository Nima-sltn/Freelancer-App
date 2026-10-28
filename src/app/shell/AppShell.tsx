import { useEffect, useState } from "react";
import { Dialog, DialogPanel } from "@headlessui/react";
import { Outlet, useLocation } from "react-router-dom";
import { useUser, useLogout } from "@/features/auth";
import { useGlobalCommands } from "@/features/command/useGlobalCommands";
import { useGlobalHotkeys } from "@/features/command/useGlobalHotkeys";
import { KeyboardShortcutsOverlay, useKeyboardOverlay } from "@/features/command";
import { useDerivedNotifications } from "@/features/notifications/useDerivedNotifications";
import { useTransactionNotifications } from "@/features/notifications/useTransactionNotifications";
import { useDashboardData } from "@/features/dashboard/useDashboardData";
import { useT } from "@/store/i18n";
import { PageLoader } from "@/components/feedback/Loading";
import { cx } from "@/lib/cx";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import OfflineBanner from "@/components/layout/OfflineBanner";

/**
 * Authenticated shell.
 *
 * Owns the responsive layout (fixed rail on desktop, focus-trapped drawer on
 * mobile), the skip-to-content link, the offline banner and the *shell-level*
 * side effects: registering commands, hotkeys and derived notifications exactly
 * once per session instead of inside each page.
 */
export function AppShell() {
  const { t, dir } = useT();
  const location = useLocation();
  const { user, isLoading } = useUser();
  const { logout, isPending } = useLogout();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useKeyboardOverlay();

  // Shell-level data: also feeds the command palette and the notification feed.
  const dashboard = useDashboardData(user, user?.role);

  useGlobalCommands({ user, projects: dashboard.projects });
  useGlobalHotkeys();
  useDerivedNotifications({
    user,
    projects: dashboard.projects,
    proposals: dashboard.proposals,
    users: dashboard.users,
  });
  // Event half of the feed: every committed/queued/rolled-back write becomes a
  // notification, so the centre reflects what the user *did*, not only what it
  // can observe in the data.
  useTransactionNotifications(user);

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Move focus to the main region on route change (screen-reader orientation).
  useEffect(() => {
    const main = document.getElementById("main-content");
    main?.focus({ preventScroll: true });
  }, [location.pathname]);

  if (isLoading || !user) return <PageLoader label={t("common.loading")} />;

  return (
    <div className="min-h-screen bg-canvas">
      <a
        href="#main-content"
        className="sr-only-focusable absolute start-4 top-4 z-50 rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-white">
        {t("a11y.skipToContent")}
      </a>

      <OfflineBanner />

      <div className="lg:grid lg:min-h-screen lg:grid-cols-[17rem_1fr]">
        <aside className="hidden border-e border-line bg-surface lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-hidden">
          <Sidebar role={user.role} />
        </aside>

        <div className="flex min-h-screen min-w-0 flex-col">
          <Topbar
            user={user}
            onOpenMenu={() => setDrawerOpen(true)}
            onLogout={logout}
            isLoadingUser={isPending}
          />

          <main
            id="main-content"
            tabIndex={-1}
            className="mx-auto w-full max-w-[80rem] flex-1 px-4 py-6 focus-visible:outline-none sm:px-6">
            <Outlet />
          </main>

          <footer className="border-t border-line px-4 py-4 text-center text-xs text-ink-muted">
            {t("app.tagline")}
          </footer>
        </div>
      </div>

      <Dialog
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        className="relative z-50 lg:hidden"
        aria-label={t("nav.menu")}>
        <div className="fixed inset-0 animate-fade-in bg-ink/50 backdrop-blur-sm" />
        <div className="fixed inset-y-0 start-0 flex w-full max-w-xs">
          <DialogPanel
            className={cx(
              "w-full border-e border-line bg-surface shadow-pop",
              dir === "rtl" ? "animate-slide-in-right" : "animate-slide-in-left"
            )}>
            <Sidebar
              role={user.role}
              onClose={() => setDrawerOpen(false)}
              onNavigate={() => setDrawerOpen(false)}
            />
          </DialogPanel>
        </div>
      </Dialog>

      <KeyboardShortcutsOverlay
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
    </div>
  );
}

export default AppShell;
