import { Suspense, lazy, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { PageLoader } from "@/components/feedback/Loading";
import { FeatureErrorBoundary } from "@/components/feedback/FeatureErrorBoundary";
import { AppShell } from "@/app/shell/AppShell";
import { PublicShell } from "@/components/layout/PublicShell";
import { ProtectedRoute } from "../guards/ProtectedRoute";
import { NavigationMarkovEngine } from "@/entities/navigation";

/**
 * Routing.
 *
 * Every page is code-split with `React.lazy`, so the landing page ships without
 * the dashboards, charts or Kanban board. Nested shells keep the layout mounted
 * across navigations (no re-mount flicker), and a small `NavigationAnnouncer`
 * tells assistive tech which page just loaded — hash-based routers never do.
 */

const HomePage = lazy(() => import("@/pages/HomePage"));
const AuthPage = lazy(() => import("@/pages/AuthPage"));
const CompleteProfilePage = lazy(() => import("@/pages/CompleteProfilePage"));
const PendingApprovalPage = lazy(() => import("@/pages/PendingApprovalPage"));
const NotAuthorizedPage = lazy(() => import("@/pages/NotAuthorizedPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const ProjectsPage = lazy(() => import("@/pages/ProjectsPage"));
const ProjectDetailPage = lazy(() => import("@/pages/ProjectDetailPage"));
const ProposalsPage = lazy(() => import("@/pages/ProposalsPage"));
const BoardPage = lazy(() => import("@/pages/BoardPage"));
const WalletPage = lazy(() => import("@/pages/WalletPage"));
const AnalyticsPage = lazy(() => import("@/pages/AnalyticsPage"));
const TimelinePage = lazy(() => import("@/pages/TimelinePage"));
const LeaderboardPage = lazy(() => import("@/pages/LeaderboardPage"));
const UsersPage = lazy(() => import("@/pages/UsersPage"));
const CategoriesPage = lazy(() => import("@/pages/CategoriesPage"));
const TrustPage = lazy(() => import("@/pages/TrustPage"));
const AuditPage = lazy(() => import("@/pages/AuditPage"));
const MessagesPage = lazy(() => import("@/pages/MessagesPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage"));
const JourneyPage = lazy(() => import("@/pages/JourneyPage"));

const markovEngine = new NavigationMarkovEngine();

const PREFETCH_LOADERS: Record<string, () => Promise<unknown>> = {
  "/projects": () => import("@/pages/ProjectsPage"),
  "/dashboard": () => import("@/pages/DashboardPage"),
  "/trust": () => import("@/pages/TrustPage"),
  "/proposals": () => import("@/pages/ProposalsPage"),
  "/wallet": () => import("@/pages/WalletPage"),
  "/timeline": () => import("@/pages/TimelinePage"),
  "/journey": () => import("@/pages/JourneyPage"),
};

/** Announces SPA navigations, records Markov transitions, and pre-warms routes. */
function NavigationAnnouncer() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    markovEngine.recordTransition(pathname);

    // Predict likely next routes based on Markov transition matrix
    const predictions = markovEngine.predictNextRoutes(
      pathname,
      Object.keys(PREFETCH_LOADERS)
    );
    const toPrefetch = predictions.filter((p) => p.shouldPrefetch);

    if (toPrefetch.length > 0) {
      const scheduleIdle =
        typeof window !== "undefined" && "requestIdleCallback" in window
          ? window.requestIdleCallback
          : (cb: () => void) => setTimeout(cb, 200);

      scheduleIdle(() => {
        toPrefetch.forEach((pred) => {
          const loader = PREFETCH_LOADERS[pred.route];
          if (loader) {
            void loader();
          }
        });
      });
    }

    const region = document.getElementById("route-announcer");
    if (region) {
      const isEn = document.documentElement.lang === "en";
      region.textContent = isEn ? `Loaded page: ${document.title}` : `صفحه جدید بارگذاری شد: ${document.title}`;
    }
  }, [pathname]);

  return (
    <output id="route-announcer" className="sr-only" />
  );
}

function withShell(element: React.ReactNode, feature?: string) {
  return (
    <FeatureErrorBoundary feature={feature}>
      <Suspense fallback={<PageLoader />}>{element}</Suspense>
    </FeatureErrorBoundary>
  );
}

export function AppRouter() {
  return (
    <>
      <NavigationAnnouncer />
      <Routes>
        {/* ---------------------------------------------------- public */}
        <Route element={<PublicShell />}>
          <Route path="/" element={withShell(<HomePage />)} />
        </Route>

        <Route path="/auth" element={withShell(<AuthPage />)} />
        <Route path="/complete-profile" element={withShell(<CompleteProfilePage />)} />
        <Route path="/pending-approval" element={withShell(<PendingApprovalPage />)} />
        <Route path="/not-authorized" element={withShell(<NotAuthorizedPage />)} />

        {/* ------------------------------------------------ owner area */}
        <Route path="/owner" element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={withShell(<DashboardPage />)} />
            <Route path="projects" element={withShell(<ProjectsPage />)} />
            <Route path="projects/:id" element={withShell(<ProjectDetailPage />)} />
            <Route path="proposals" element={withShell(<ProposalsPage />)} />
            <Route path="timeline" element={withShell(<TimelinePage />)} />
            <Route path="wallet" element={withShell(<WalletPage />)} />
            <Route path="analytics" element={withShell(<AnalyticsPage />)} />
            <Route path="trust" element={withShell(<TrustPage />)} />
            <Route path="audit" element={withShell(<AuditPage />)} />
            <Route path="messages" element={withShell(<MessagesPage />)} />
            <Route path="notifications" element={withShell(<NotificationsPage />)} />
            <Route path="settings" element={withShell(<SettingsPage />)} />
            <Route path="journey" element={withShell(<JourneyPage />)} />
          </Route>
        </Route>

        {/* ------------------------------------------- freelancer area */}
        <Route path="/freelancer" element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={withShell(<DashboardPage />)} />
            <Route path="projects" element={withShell(<ProjectsPage />)} />
            <Route path="projects/:id" element={withShell(<ProjectDetailPage />)} />
            <Route path="proposals" element={withShell(<ProposalsPage />)} />
            <Route path="board" element={withShell(<BoardPage />)} />
            <Route path="timeline" element={withShell(<TimelinePage />)} />
            <Route path="wallet" element={withShell(<WalletPage />)} />
            <Route path="leaderboard" element={withShell(<LeaderboardPage />)} />
            <Route path="messages" element={withShell(<MessagesPage />)} />
            <Route path="notifications" element={withShell(<NotificationsPage />)} />
            <Route path="settings" element={withShell(<SettingsPage />)} />
            <Route path="journey" element={withShell(<JourneyPage />)} />
          </Route>
        </Route>

        {/* ------------------------------------------------ admin area */}
        <Route path="/admin" element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={withShell(<DashboardPage />)} />
            <Route path="users" element={withShell(<UsersPage />)} />
            <Route path="projects" element={withShell(<ProjectsPage />)} />
            <Route path="projects/:id" element={withShell(<ProjectDetailPage />)} />
            <Route path="proposals" element={withShell(<ProposalsPage />)} />
            <Route path="categories" element={withShell(<CategoriesPage />)} />
            <Route path="analytics" element={withShell(<AnalyticsPage />)} />
            <Route path="trust" element={withShell(<TrustPage />)} />
            <Route path="audit" element={withShell(<AuditPage />)} />
            <Route path="messages" element={withShell(<MessagesPage />)} />
            <Route path="notifications" element={withShell(<NotificationsPage />)} />
            <Route path="settings" element={withShell(<SettingsPage />)} />
            <Route path="journey" element={withShell(<JourneyPage />)} />
          </Route>
        </Route>

        <Route path="*" element={withShell(<NotFoundPage />)} />
      </Routes>
    </>
  );
}

export default AppRouter;
