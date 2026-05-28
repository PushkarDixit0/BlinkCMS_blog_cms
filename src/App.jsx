import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import HomePage from "./components/HomePage";
import Admin from "./components/Admin";
import Login from "./components/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import { getAuthState } from "./auth";

function RootRedirect() {
  return (
    <Navigate
      to={getAuthState().isAuthenticated ? "/admin" : "/login"}
      replace
    />
  );
}

function App() {
  return (
    <>
      <Routes>
        <Route path="/admin" element={<RootRedirect />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}

export default App;
