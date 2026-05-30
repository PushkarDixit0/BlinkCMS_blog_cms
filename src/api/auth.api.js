import { apiClient } from "./client";

export function loginAdmin(credentials) {
  return apiClient.post("/admin/login", credentials);
}

export function getCurrentUser() {
  return apiClient.get("/admin");
}
