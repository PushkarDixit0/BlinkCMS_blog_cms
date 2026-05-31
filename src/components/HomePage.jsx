import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import Header from "./Header";
import { useComments, useCreateComment } from "../hooks/useComments";
import { usePublishedPosts } from "../hooks/usePosts";
import { commentFormSchema } from "../schemas/comment.schema";

function PublicComments({ postId }) {
  const commentsQuery = useComments(postId);
  const createCommentMutation = useCreateComment(postId);
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm({
    resolver: zodResolver(commentFormSchema),
    defaultValues: {
      authorName: "",
      comment: "",
    },
  });

  function submitComment(values) {
    createCommentMutation.mutate(values, {
      onSuccess: () => reset(),
    });
  }

  const comments = commentsQuery.data?.comments || [];

  return (
    <section className="public-comments">
      <div className="comments-heading">
        <h3>Comments</h3>
        <span>{comments.length}</span>
      </div>
      {commentsQuery.isLoading ? <p className="empty-comments">Loading comments...</p> : null}
      {comments.length ? (
        <div className="comment-list public-comment-list">
          {comments.map((comment) => (
            <article className="public-comment" key={comment._id}>
              <p>{comment.comment}</p>
              <span>{comment.authorName}</span>
            </article>
          ))}
        </div>
      ) : commentsQuery.isLoading ? null : (
        <p className="empty-comments">No comments yet.</p>
      )}
      <form className="comment-form" onSubmit={handleSubmit(submitComment)}>
        <input placeholder="Your name" {...register("authorName")} />
        {errors.authorName ? (
          <span className="field-error">{errors.authorName.message}</span>
        ) : null}
        <textarea rows="3" placeholder="Add a comment" {...register("comment")} />
        {errors.comment ? (
          <span className="field-error">{errors.comment.message}</span>
        ) : null}
        <button type="submit" disabled={createCommentMutation.isPending}>
          {createCommentMutation.isPending ? "Posting..." : "Comment"}
        </button>
      </form>
      {createCommentMutation.error ? (
        <p className="form-error">{createCommentMutation.error.message}</p>
      ) : null}
    </section>
  );
}

function HomePage() {
  const postsQuery = usePublishedPosts();
  const posts = postsQuery.data?.posts || [];

  return (
    <>
      <Header />
      <main className="home-page">
        <section className="blog-feed">
          <div className="feed-header">
            <p className="eyebrow">Published Posts</p>
            <h1>Blog CMS</h1>
          </div>

          {postsQuery.error ? (
            <p className="form-error">{postsQuery.error.message}</p>
          ) : null}

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
                    <PublicComments postId={post._id} />
                  </div>
                </article>
              ))
            ) : postsQuery.isLoading ? (
              <p>Loading published posts...</p>
            ) : (
              <p>No published posts yet.</p>
            )}
          </div>
        </section>
      </main>
    </>
  );
}

export default HomePage;
