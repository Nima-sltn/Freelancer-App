import { useLocation } from "react-router-dom";
import { ROLE_PREFIX } from "@/config/navigation";
import type { User, UserRole } from "@/types";
import useUser from "./useUser";

export interface AuthorizationState {
  isLoading: boolean;
  isAuthenticated: boolean;
  /** The signed-in user matches the role required by the route prefix. */
  isAuthorized: boolean;
  isVerified: boolean;
  user: User | undefined;
  /** Role implied by the current path, if any. */
  requiredRole: UserRole | undefined;
}

const PREFIX_TO_ROLE: Record<string, UserRole> = {
  [ROLE_PREFIX.OWNER]: "OWNER",
  [ROLE_PREFIX.FREELANCER]: "FREELANCER",
  [ROLE_PREFIX.ADMIN]: "ADMIN",
};

/**
 * Route-level authorization.
 *
 * Derives the required role from the URL prefix (`/owner/**` → OWNER) instead of
 * a separate duplicated map, and treats an unverified profile as "authenticated
 * but not verified" so the UI can explain *why* access is blocked rather than
 * silently redirecting to the home page.
 */
export function useAuthorize(): AuthorizationState {
  const { isLoading, user, isAuthenticated, isVerified } = useUser();
  const { pathname } = useLocation();

  const prefix = `/${pathname.split("/").filter(Boolean)[0] ?? ""}`;
  const requiredRole = PREFIX_TO_ROLE[prefix];

  const isAuthorized = Boolean(requiredRole && user?.role === requiredRole);

  return {
    isLoading,
    isAuthenticated,
    isAuthorized,
    isVerified,
    user,
    requiredRole,
  };
}

export default useAuthorize;
