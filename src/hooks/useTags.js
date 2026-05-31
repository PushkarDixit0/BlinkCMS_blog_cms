import { useQuery } from "@tanstack/react-query";
import { getTagsFromPosts } from "../api/index.js";
import { queryKeys } from "../lib/queryKeys";
import { usePublishedPosts } from "./usePosts";

export function useTags() {
  const publishedPostsQuery = usePublishedPosts();

  return useQuery({
    queryKey: queryKeys.tags.all,
    queryFn: () => getTagsFromPosts(publishedPostsQuery.data?.posts || []),
    enabled: publishedPostsQuery.isSuccess,
  });
}
