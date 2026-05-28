import { Navigate, useLocation } from "react-router-dom";
import { getAuthState } from "../auth";

function ProtectedRoute({ children }) {
  const location = useLocation();
  const authState = getAuthState();

  if (!authState.isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location, reason: authState.reason }}
      />
    );
  }

  return children;
}

export default ProtectedRoute;
