import { getAuthState } from "./auth";

const API_BASE_URL = (
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

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    throw new Error(data?.message || `Request failed with ${response.status}.`);
  }

  return data;
}

function getAuthHeaders() {
  const authState = getAuthState();

  if (!authState.isAuthenticated) {
    return {};
  }

  return {
    Authorization: `Bearer ${authState.token}`,
    "X-Session-Id": authState.session.id,
  };
}

function request(path, options = {}) {
  const headers = {
    ...(options.body instanceof FormData
      ? {}
      : { "Content-Type": "application/json" }),
    ...getAuthHeaders(),
    ...options.headers,
  };

  return fetch(toApiUrl(path), {
    ...options,
    headers,
  }).then(parseResponse);
}

export function loginAdmin(credentials) {
  return request("/admin/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function getHomePosts() {
  return request("/home");
}

export function getAdminDashboard() {
  return request("/admin");
}

export function getEditorPost(postId) {
  return request(postId ? `/editor/${postId}` : "/editor");
}

export function createPost(post) {
  return request("/post", {
    method: "POST",
    body: JSON.stringify(post),
  });
}

export function updatePost(postId, post) {
  return request(`/posts/${postId}`, {
    method: "PUT",
    body: JSON.stringify(post),
  });
}

export function deletePost(postId) {
  return request(`/posts/${postId}`, {
    method: "DELETE",
  });
}

export function uploadEditorAsset(file) {
  const formData = new FormData();
  formData.append("image", file);

  return request("/post/assets", {
    method: "POST",
    body: formData,
  });
}
