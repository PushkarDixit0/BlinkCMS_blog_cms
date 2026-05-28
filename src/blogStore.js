const POSTS_STORAGE_KEY = "blogCmsLocalPosts";

function readPosts() {
  try {
    const posts = JSON.parse(localStorage.getItem(POSTS_STORAGE_KEY));
    return Array.isArray(posts) ? posts : [];
  } catch {
    return [];
  }
}

function writePosts(posts) {
  localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts));
}

export function getStoredPosts() {
  return readPosts();
}

export function getStoredPost(postId) {
  return readPosts().find((post) => post._id === postId) || null;
}

export function saveStoredPost(post) {
  const posts = readPosts();
  const postId = post._id || crypto.randomUUID();
  const storedPost = {
    ...post,
    _id: postId,
    updatedAt: new Date().toISOString(),
  };
  const existingIndex = posts.findIndex((item) => item._id === postId);

  if (existingIndex === -1) {
    writePosts([storedPost, ...posts]);
  } else {
    posts[existingIndex] = storedPost;
    writePosts(posts);
  }

  return storedPost;
}

export function deleteStoredPost(postId) {
  writePosts(readPosts().filter((post) => post._id !== postId));
}
