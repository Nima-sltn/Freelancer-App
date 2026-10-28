import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthorize } from "@/features/auth";
import { PageLoader } from "@/components/feedback/Loading";

/**
 * Route guard.
 *
 * Three distinct outcomes are handled explicitly instead of one blanket
 * redirect:
 *   - no session           → /auth, remembering where the user wanted to go
 *   - unverified session   → /pending-approval (so the user learns *why*)
 *   - wrong role           → /not-authorized
 * The previous implementation redirected to a route that did not exist and
 * rendered guarded content for anonymous visitors.
 */
export function ProtectedRoute() {
  const { isLoading, isAuthenticated, isVerified, isAuthorized } = useAuthorize();
  const location = useLocation();

  if (isLoading) return <PageLoader />;

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: location.pathname + location.search }} />;
  }

  if (!isVerified) {
    return <Navigate to="/pending-approval" replace />;
  }

  if (!isAuthorized) {
    return <Navigate to="/not-authorized" replace />;
  }

  return <Outlet />;
}

/** Guard for pages that need a session but not a specific role. */
export function AuthOnlyRoute() {
  const { isLoading, isAuthenticated } = useAuthorize();
  const location = useLocation();

  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}

export default ProtectedRoute;
