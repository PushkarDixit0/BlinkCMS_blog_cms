import { apiClient } from "./client";

export function getPostComments(postId) {
  return apiClient.get(`/posts/${postId}/comments`);
}

export function createComment(postId, comment) {
  return apiClient.post(`/posts/${postId}/comments`, comment);
}

export function getAdminComments() {
  return apiClient.get("/admin/comments");
}

export function updateAdminComment(commentId, status) {
  return apiClient.put(`/admin/comments/${commentId}`, { status });
}

export function deleteAdminComment(commentId) {
  return apiClient.delete(`/admin/comments/${commentId}`);
}
