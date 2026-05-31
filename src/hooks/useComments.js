import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createComment,
  deleteAdminComment,
  getAdminComments,
  getPostComments,
  updateAdminComment,
} from "../api/index.js";
import { queryKeys } from "../lib/queryKeys";

export function useComments(postId) {
  return useQuery({
    queryKey: queryKeys.comments.byPost(postId),
    queryFn: () => getPostComments(postId),
    enabled: Boolean(postId),
  });
}

export function useAdminComments() {
  return useQuery({
    queryKey: queryKeys.comments.admin,
    queryFn: getAdminComments,
  });
}

export function useCreateComment(postId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => createComment(postId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.comments.byPost(postId),
      });
    },
  });
}

export function useUpdateAdminComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, status }) => updateAdminComment(commentId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.admin });
    },
  });
}

export function useDeleteAdminComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAdminComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.admin });
    },
  });
}
