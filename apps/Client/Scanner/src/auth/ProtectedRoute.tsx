import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "./useAuth";

const ProtectedRoute = () => {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-400">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p>Verifying permissions...</p>
        </div>
      </div>
    );
  }

  if (status === "authenticated") {
    return <Outlet />;
  }

  return (
    <Navigate
      to="/login"
      replace
      state={{ from: location.pathname + location.search }}
    />
  );
};

export default ProtectedRoute;
