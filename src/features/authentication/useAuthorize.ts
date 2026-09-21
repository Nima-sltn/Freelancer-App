import { useLocation } from "react-router-dom";
import useUser from "./useUser";
import type { User } from "../../types";

export default function useAuthorize(): {
  isLoading: boolean;
  isAuthenticated: boolean;
  isAuthorized: boolean;
  user: User;
  isVerified: boolean;
} {
  const { isLoading, user } = useUser();
  const { pathname } = useLocation();

  let isAuthenticated = false;
  if (user) isAuthenticated = true;
  let isAuthorized = false;

  let isVerified = false;
  if (user && Number(user.status) === 2) isVerified = true;

  const ROLES: Record<string, string> = {
    admin: "ADMIN",
    freelancer: "FREELANCER",
    owner: "OWNER",
  };

  const desiredRole = pathname.split("/").at(1);

  if (desiredRole && Object.keys(ROLES).includes(desiredRole)) {
    if (user && user.role === ROLES[desiredRole]) isAuthorized = true;
  }

  return { isLoading, isAuthenticated, isAuthorized, user, isVerified };
}
