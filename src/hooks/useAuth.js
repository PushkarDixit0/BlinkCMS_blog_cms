import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser, loginAdmin } from "../api/index.js";
import { getAuthState, saveAuthSession } from "../auth";
import { queryKeys } from "../lib/queryKeys";

export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: getCurrentUser,
    enabled: getAuthState().isAuthenticated,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials) => {
      const authResult = await loginAdmin(credentials);
      const wasSaved = saveAuthSession(authResult);

      if (!wasSaved) {
        throw new Error("Login failed because the JWT token could not be validated.");
      }

      return authResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });
}
