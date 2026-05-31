export const queryKeys = {
  auth: {
    me: ["auth", "me"],
  },
  posts: {
    all: ["posts"],
    dashboard: ["posts", "dashboard"],
    published: ["posts", "published"],
    detail: (postId) => ["posts", postId],
    editor: (postId) => ["posts", "editor", postId || "create"],
  },
  comments: {
    admin: ["comments", "admin"],
    byPost: (postId) => ["comments", postId],
  },
  tags: {
    all: ["tags"],
  },
};
