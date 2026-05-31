import axios from "axios";
import { clearAuthSession, getAuthState } from "../auth";

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

export function toApiUrl(path) {
  if (!path) {
    return "";
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const authState = getAuthState();

  if (authState.isAuthenticated) {
    config.headers.Authorization = `Bearer ${authState.token}`;
    config.headers["X-Session-Id"] = authState.session.id;
  }

  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const data = error.response?.data;

    if (status === 401) {
      clearAuthSession();
    }

    const requestError = new Error(
      data?.message || error.message || "Request failed.",
    );
    requestError.status = status;
    requestError.errors = data?.errors || {};
    throw requestError;
  },
);
