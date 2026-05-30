export function getTagsFromPosts(posts = []) {
  return Array.from(
    new Set(posts.flatMap((post) => post.tags || []).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));
}
