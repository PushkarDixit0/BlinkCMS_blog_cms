import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPost,
  deletePost,
  getAdminDashboard,
  getEditorPost,
  getHomePosts,
  getPost,
  updatePost,
} from "../api/index.js";
import { queryKeys } from "../lib/queryKeys";

export function usePublishedPosts() {
  return useQuery({
    queryKey: queryKeys.posts.published,
    queryFn: getHomePosts,
  });
}

export function useAdminDashboard() {
  return useQuery({
    queryKey: queryKeys.posts.dashboard,
    queryFn: getAdminDashboard,
  });
}

export function usePost(postId) {
  return useQuery({
    queryKey: queryKeys.posts.detail(postId),
    queryFn: () => getPost(postId),
    enabled: Boolean(postId),
  });
}

export function useEditorPost(postId, enabled = true) {
  return useQuery({
    queryKey: queryKeys.posts.editor(postId),
    queryFn: () => getEditorPost(postId),
    enabled,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
    },
  });
}

export function useUpdatePost(postId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => updatePost(postId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(postId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.editor(postId) });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
    },
  });
}
