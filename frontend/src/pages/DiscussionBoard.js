import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function DiscussionBoard() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPosts = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/discussion_board/", {
          credentials: "include",
        });
        const data = await res.json();
        setPosts(data.posts || []);
      } catch (err) {
        console.log("Failed to load posts");
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, []);

  if (loading) return <div className="p-6 text-center">Loading...</div>;

  return (
    <div className="container mx-auto max-w-3xl p-4">
      <h2 className="text-3xl font-bold mb-6 text-center">Discussion Board</h2>

      <Link to="/discussion/new" className="btn btn-primary mb-4">
        ➕ Create a Post
      </Link>

      {posts.length === 0 ? (
        <p className="text-center opacity-70">No posts yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <div key={post.id} className="card bg-base-100 shadow-lg p-4">
              <h3 className="text-xl font-bold">{post.title}</h3>
              <p className="opacity-70">{post.body}</p>

              <Link
                to={`/discussion/${post.id}`}
                className="btn btn-sm btn-outline mt-3"
              >
                View Comments ({post.comments_count || 0})
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}