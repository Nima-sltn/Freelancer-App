import { useQuery } from "@tanstack/react-query";
import { getUser } from "../../services/authService";
import type { User } from "../../types";

export default function useUser(): {
  isLoading: boolean;
  user: User;
} {
  const { data, isLoading } = useQuery({
    queryKey: ["user"],
    queryFn: getUser,
    retry: false,
  });

  const { user } = data || { user: {} as User };

  return { isLoading, user };
}
