import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { clearAuthSession, getAuthState } from "../auth";
import { getStoredPosts } from "../blogStore";
import {
  useAdminComments,
  useDeleteAdminComment,
  useUpdateAdminComment,
} from "../hooks/useComments";
import { useAdminDashboard } from "../hooks/usePosts";

function Admin() {
  const navigate = useNavigate();
  const authState = getAuthState();
  const dashboardQuery = useAdminDashboard();
  const commentsQuery = useAdminComments();
  const updateCommentMutation = useUpdateAdminComment();
  const deleteCommentMutation = useDeleteAdminComment();
  const [storedPosts] = useState(() => getStoredPosts());

  function handleLogout() {
    clearAuthSession();
    navigate("/login", { replace: true });
  }

  function setCommentStatus(commentId, status) {
    updateCommentMutation.mutate({ commentId, status });
  }

  function removeComment(commentId) {
    deleteCommentMutation.mutate(commentId);
  }

  const dashboard = dashboardQuery.data;
  const comments = commentsQuery.data?.comments || [];
  const error =
    dashboardQuery.error?.message ||
    commentsQuery.error?.message ||
    updateCommentMutation.error?.message ||
    deleteCommentMutation.error?.message;
  const remotePosts = [
    ...(dashboard?.publishedPosts || []),
    ...(dashboard?.draftPosts || []),
  ];
  const allPosts = [...storedPosts, ...remotePosts];

  return (
    <main className="admin-page">
      <section className="admin-header">
        <div>
          <p className="eyebrow">Protected Area</p>
          <h1>Admin Page</h1>
          <p className="auth-copy">
            Session and JWT token checks passed for{" "}
            {authState.session?.user?.username || "admin"}.
          </p>
        </div>

        <button type="button" onClick={handleLogout}>
          Log out
        </button>
      </section>

      {error ? <p className="form-error">{error}</p> : null}

      <section className="dashboard-panel">
        <div className="dashboard-totals">
          <span>All: {(dashboard?.totals?.all ?? 0) + storedPosts.length}</span>
          <span>
            Published:{" "}
            {(dashboard?.totals?.published ?? 0) +
              storedPosts.filter((post) => post.status === "published").length}
          </span>
          <span>
            Drafts:{" "}
            {(dashboard?.totals?.draft ?? 0) +
              storedPosts.filter((post) => post.status === "draft").length}
          </span>
        </div>

        <div className="admin-actions">
          <button type="button" onClick={() => navigate("/editor")}>
            Add
          </button>
        </div>

        <div className="post-list">
          {dashboard
            ? allPosts.map((post) => (
                <article
                  className="post-row"
                  key={post._id}
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    navigate(`/editor/${post._id}`, { state: { post } })
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      navigate(`/editor/${post._id}`, { state: { post } });
                    }
                  }}
                >
                  <div>
                    <h2>{post.title}</h2>
                    {post.content ? (
                      <div dangerouslySetInnerHTML={{ __html: post.content }} />
                    ) : null}
                    {post.tags?.length ? (
                      <div className="tag-list readonly-tags">
                        {post.tags.map((tag) => (
                          <span key={tag}>{tag}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <span className="post-meta">{post.status}</span>
                </article>
              ))
            : dashboardQuery.isLoading
              ? "Loading dashboard..."
              : "No posts yet."}
        </div>

        <section className="comments-panel">
          <div className="feed-header">
            <p className="eyebrow">Moderation</p>
            <h2>Comments</h2>
          </div>

          <div className="comment-list max-h-96 overflow-y-auto">
            {commentsQuery.isLoading ? <p>Loading comments...</p> : null}
            {comments.length ? (
              comments.map((comment) => (
                <article key={comment._id}>
                  <p>{comment.comment}</p>
                  <span>
                    {comment.authorName} on{" "}
                    {comment.postId?.title || "Deleted post"} - {comment.status}
                  </span>
                  <div>
                    <button
                      type="button"
                      disabled={updateCommentMutation.isPending}
                      onClick={() => setCommentStatus(comment._id, "approved")}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={updateCommentMutation.isPending}
                      onClick={() =>
                        setCommentStatus(comment._id, "unapproved")
                      }
                    >
                      Unapprove
                    </button>
                    <button
                      type="button"
                      disabled={updateCommentMutation.isPending}
                      onClick={() => setCommentStatus(comment._id, "hidden")}
                    >
                      Hide
                    </button>
                    <button
                      type="button"
                      className="danger-action"
                      disabled={deleteCommentMutation.isPending}
                      onClick={() => removeComment(comment._id)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))
            ) : commentsQuery.isLoading ? null : (
              <p>No comments yet.</p>
            )}
          </div>
        </section>

        <Link className="admin-link" to="/">
          View site
        </Link>
      </section>
    </main>
  );
}

export default Admin;
