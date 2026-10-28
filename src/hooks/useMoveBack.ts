import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

/** Navigates back, falling back to a safe route when there is no history. */
export function useMoveBack(fallback = "/"): () => void {
  const navigate = useNavigate();
  return useCallback(() => {
    if (window.history.length > 1) navigate(-1);
    else navigate(fallback, { replace: true });
  }, [navigate, fallback]);
}

export default useMoveBack;
