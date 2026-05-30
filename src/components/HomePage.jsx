import { useEffect, useState } from "react";
import { createComment, getHomePosts, getPostComments } from "../api";
import Header from "./Header";

function HomePage() {
  const [posts, setPosts] = useState([]);
  const [commentsByPost, setCommentsByPost] = useState({});
  const [commentForms, setCommentForms] = useState({});
  const [error, setError] = useState("");
  const [commentError, setCommentError] = useState("");
  const [submittingCommentId, setSubmittingCommentId] = useState("");

  useEffect(() => {
    let isCurrent = true;

    getHomePosts()
      .then(async (data) => {
        const nextPosts = data?.posts || [];
        const commentsEntries = await Promise.all(
          nextPosts.map(async (post) => {
            const commentsData = await getPostComments(post._id);
            return [post._id, commentsData?.comments || []];
          }),
        );

        if (isCurrent) {
          setPosts(nextPosts);
          setCommentsByPost(Object.fromEntries(commentsEntries));
        }
      })
      .catch((requestError) => {
        if (isCurrent) {
          setError(requestError.message);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  function updateCommentForm(postId, field, value) {
    setCommentForms((currentForms) => ({
      ...currentForms,
      [postId]: {
        authorName: "",
        comment: "",
        ...currentForms[postId],
        [field]: value,
      },
    }));
  }

  async function submitComment(event, postId) {
    event.preventDefault();
    setCommentError("");
    setSubmittingCommentId(postId);

    try {
      const form = commentForms[postId] || {};
      const data = await createComment(postId, {
        authorName: form.authorName,
        comment: form.comment,
      });

      setCommentsByPost((currentComments) => ({
        ...currentComments,
        [postId]: [...(currentComments[postId] || []), data.comment],
      }));
      setCommentForms((currentForms) => ({
        ...currentForms,
        [postId]: { authorName: "", comment: "" },
      }));
    } catch (requestError) {
      setCommentError(requestError.message);
    } finally {
      setSubmittingCommentId("");
    }
  }

  return (
    <>
      <Header />
      <main className="home-page">
        <section className="blog-feed">
          <div className="feed-header">
            <p className="eyebrow">Published Posts</p>
            <h1>Blog CMS</h1>
          </div>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="post-list">
            {posts.length ? (
              posts.map((post) => (
                <article className="post-row" key={post._id}>
                  <div className="w-full">
                    <div className="flex justify-between gap-5 py-5">
                      <h2>{post.title}</h2>
                      <span className="post-meta">{post.author}</span>
                    </div>
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
                    <section className="public-comments">
                      <div className="comments-heading">
                        <h3>Comments</h3>
                        <span>{commentsByPost[post._id]?.length || 0}</span>
                      </div>
                      {commentsByPost[post._id]?.length ? (
                        <div className="comment-list public-comment-list">
                          {commentsByPost[post._id].map((comment) => (
                            <article
                              className="public-comment"
                              key={comment._id}
                            >
                              <p>{comment.comment}</p>
                              <span>{comment.authorName}</span>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <p className="empty-comments">No comments yet.</p>
                      )}
                      <form
                        className="comment-form"
                        onSubmit={(event) => submitComment(event, post._id)}
                      >
                        <input
                          value={commentForms[post._id]?.authorName || ""}
                          onChange={(event) =>
                            updateCommentForm(
                              post._id,
                              "authorName",
                              event.target.value,
                            )
                          }
                          placeholder="Your name"
                        />
                        <textarea
                          rows="3"
                          value={commentForms[post._id]?.comment || ""}
                          onChange={(event) =>
                            updateCommentForm(
                              post._id,
                              "comment",
                              event.target.value,
                            )
                          }
                          placeholder="Add a comment"
                        />
                        <button
                          type="submit"
                          disabled={submittingCommentId === post._id}
                        >
                          {submittingCommentId === post._id
                            ? "Posting..."
                            : "Comment"}
                        </button>
                      </form>
                    </section>
                  </div>
                </article>
              ))
            ) : (
              <p>No published posts yet.</p>
            )}
          </div>
          {commentError ? <p className="form-error">{commentError}</p> : null}
        </section>
      </main>
    </>
  );
}

export default HomePage;
