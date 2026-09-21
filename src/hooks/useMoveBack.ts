import { useNavigate } from "react-router-dom";

export default function useMoveBack(): () => void {
  const navigate = useNavigate();
  return () => navigate(-1);
}
