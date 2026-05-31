import { apiClient } from "./client";

export function uploadEditorAsset(file) {
  const formData = new FormData();
  formData.append("image", file);

  return apiClient.post("/post/assets", formData);
}
