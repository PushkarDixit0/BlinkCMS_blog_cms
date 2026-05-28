import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { createDemoJwt, getAuthState, saveAuthSession } from "../auth";

const fallbackMessages = {
  "invalid-session": "Your session is missing or expired. Please log in again.",
  "invalid-token": "Your security token is missing or invalid. Please log in again.",
};

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const authState = getAuthState();
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const from = location.state?.from?.pathname || "/admin";

  if (authState.isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setCredentials((currentCredentials) => ({
      ...currentCredentials,
      [name]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!credentials.username.trim() || !credentials.password.trim()) {
      setError("Enter both username and password.");
      return;
    }

    const token = createDemoJwt(credentials.username.trim());
    const wasSaved = saveAuthSession({
      token,
      user: { username: credentials.username.trim(), role: "admin" },
    });

    if (!wasSaved) {
      setError("Login failed because the JWT token could not be validated.");
      return;
    }

    navigate(from, { replace: true });
  }

  return (
    <main className="auth-page">
      <form className="login-panel" onSubmit={handleSubmit}>
        <div>
          <p className="eyebrow">Admin Access</p>
          <h1>Sign in</h1>
          <p className="auth-copy">
            {fallbackMessages[location.state?.reason] ||
              "Use your admin credentials to continue."}
          </p>
        </div>

        <label>
          Username
          <input
            autoComplete="username"
            name="username"
            onChange={handleChange}
            type="text"
            value={credentials.username}
          />
        </label>

        <label>
          Password
          <input
            autoComplete="current-password"
            name="password"
            onChange={handleChange}
            type="password"
            value={credentials.password}
          />
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <button type="submit">Log in</button>
      </form>
    </main>
  );
}

export default Login;
