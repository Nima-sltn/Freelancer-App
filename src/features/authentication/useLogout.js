import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logoutApi } from "./../../services/authService";
import { useNavigate } from "react-router-dom";

export default function useLogout() {
  const queryclient = useQueryClient();
  const navigate = useNavigate();

  const { isPending, mutate: logout } = useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      queryclient.removeQueries();
      navigate("/auth", { replace: true });
    },
  });

  return { isPending, logout };
}
