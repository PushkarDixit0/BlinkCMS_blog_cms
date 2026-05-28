import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAdminDashboard } from "../api";
import { clearAuthSession, getAuthState } from "../auth";
import { getStoredPosts } from "../blogStore";

function Admin() {
  const navigate = useNavigate();
  const authState = getAuthState();
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [storedPosts] = useState(() => getStoredPosts());

  useEffect(() => {
    let isCurrent = true;

    getAdminDashboard()
      .then((data) => {
        if (isCurrent) {
          setDashboard(data);
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

  function handleLogout() {
    clearAuthSession();
    navigate("/login", { replace: true });
  }

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
                    ) : (
                      <p>{post.excerpt}</p>
                    )}
                    <p>{post.slug || "Open to continue editing."}</p>
                  </div>
                  <span>{post.status}</span>
                </article>
              ))
            : "Loading dashboard..."}
        </div>

        <Link className="admin-link" to="/">
          View site
        </Link>
      </section>
    </main>
  );
}

export default Admin;
