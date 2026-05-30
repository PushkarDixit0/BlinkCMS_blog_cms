import { apiClient } from "./client";

export function getHomePosts() {
  return apiClient.get("/home");
}

export function getAdminDashboard() {
  return apiClient.get("/admin");
}

export function getPost(postId) {
  return apiClient.get(`/posts/${postId}`);
}

export function getEditorPost(postId) {
  return apiClient.get(postId ? `/editor/${postId}` : "/editor");
}

export function createPost(post) {
  return apiClient.post("/post", post);
}

export function updatePost(postId, post) {
  return apiClient.put(`/posts/${postId}`, post);
}

export function deletePost(postId) {
  return apiClient.delete(`/posts/${postId}`);
}
