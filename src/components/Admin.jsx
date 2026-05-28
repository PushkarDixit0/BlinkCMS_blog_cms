import { useNavigate } from "react-router-dom";
import { clearAuthSession, getAuthState } from "../auth";

function Admin() {
  const navigate = useNavigate();
  const authState = getAuthState();

  function handleLogout() {
    clearAuthSession();
    navigate("/login", { replace: true });
  }

  return (
    <main className="admin-page">
      <div className="admin-header">
        <div>
          <p className="eyebrow">Protected Area</p>
          <h1>Admin Page</h1>
          <p className="auth-copy">
            Session and JWT token checks passed for{" "}
            {authState.session?.user?.username || "admin"}.
          </p>
        </div>

        <button type="button" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </main>
  );
}

export default Admin;
