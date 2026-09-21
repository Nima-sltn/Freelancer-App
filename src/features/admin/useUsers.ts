import { useQuery } from "@tanstack/react-query";
import { getUsersApi } from "../../services/authService";
import type { User } from "../../types";

export default function useUsers(): {
  isLoading: boolean;
  users: User[];
} {
  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: getUsersApi,
  });

  const { users } = data || { users: [] };

  return { isLoading, users };
}
