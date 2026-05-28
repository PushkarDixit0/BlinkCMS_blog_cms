import { useEffect, useState } from "react";
import { getHomePosts } from "../api";
import Header from "./Header";

function HomePage() {
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    getHomePosts()
      .then((data) => {
        if (isCurrent) {
          setPosts(data?.posts || []);
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
                  <div>
                    <h2>{post.title}</h2>
                    {post.content ? (
                      <div dangerouslySetInnerHTML={{ __html: post.content }} />
                    ) : (
                      <p>{post.excerpt}</p>
                    )}
                  </div>
                  <span>{post.author}</span>
                </article>
              ))
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
