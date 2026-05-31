import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { getAuthState } from "../auth";
import { useLogin } from "../hooks/useAuth";
import { loginFormSchema } from "../schemas/auth.schema";

const fallbackMessages = {
  "invalid-session": "Your session is missing or expired. Please log in again.",
  "invalid-token": "Your security token is missing or invalid. Please log in again.",
};

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const authState = getAuthState();
  const loginMutation = useLogin();
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });
  const from = location.state?.from?.pathname || "/admin";

  if (authState.isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  function onSubmit(credentials) {
    loginMutation.mutate(credentials, {
      onSuccess: () => navigate(from, { replace: true }),
    });
  }

  return (
    <main className="auth-page">
      <form className="login-panel" onSubmit={handleSubmit(onSubmit)}>
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
            type="text"
            {...register("username")}
          />
          {errors.username ? (
            <span className="field-error">{errors.username.message}</span>
          ) : null}
        </label>

        <label>
          Password
          <input
            autoComplete="current-password"
            type="password"
            {...register("password")}
          />
          {errors.password ? (
            <span className="field-error">{errors.password.message}</span>
          ) : null}
        </label>

        {loginMutation.error ? (
          <p className="form-error">{loginMutation.error.message}</p>
        ) : null}

        <button type="submit" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? "Logging in..." : "Log in"}
        </button>
      </form>
    </main>
  );
}

export default Login;
