import { useNavigate } from "react-router-dom";
import useAuthorize from "../features/authentication/useAuthorize";
import { useEffect } from "react";
import Loading from "./Loading";
import toast from "react-hot-toast";

function ProtectedRoute({ children }) {
  const navigate = useNavigate();
  const { isAuthenticated, isAuthorized, isLoading, isVerified } =
    useAuthorize();

  useEffect(() => {
    if (!isAuthenticated && !isLoading) navigate("/auth");
    if (!isVerified && !isLoading) {
      toast.error("پروفایل شما در انتظار تایید است");
      navigate("/");
    }
    if (!isAuthorized && !isLoading) navigate("/not-access");
  }, [isAuthenticated, isVerified, isAuthorized, isLoading, navigate]);

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-screen bg-secondary-100">
        <Loading />
      </div>
    );

  if (isAuthenticated && isAuthorized) return children;
}

export default ProtectedRoute;
