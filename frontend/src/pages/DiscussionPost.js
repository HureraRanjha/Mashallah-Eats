import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { API_BASE_URL } from "../config";
import { useAuth } from "../context/AuthContext";

export default function DiscussionPost() {
  const { id } = useParams();
  const { user } = useAuth();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    loadPost();
  }, [id]);

  const loadPost = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/topic/?post_id=${id}`, {
        credentials: "include",
      });
      const data = await res.json();
      setPost(data.post);
      setComments(data.comments || []);
    } catch (error) {
      console.error("Failed to load post:", error);
    } finally {
      setLoading(false);
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!newComment.trim()) {
      setErrorMsg("Please enter a comment");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/reply/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          topic_id: id,
          body: newComment,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setNewComment("");
        loadPost(); // Reload to get new comment
      } else {
        setErrorMsg(data.error || "Failed to post comment");
      }
    } catch (error) {
      console.error(error);
      setErrorMsg("Server error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  if (!post) {
    return <div className="p-6 text-center text-error">Post not found</div>;
  }

  return (
    <div className="container mx-auto max-w-3xl p-4">
      {/* Back Button */}
      <Link to="/discussion" className="btn btn-ghost btn-sm mb-4">
        ← Back to Discussion Board
      </Link>

      {/* Post Card */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title text-2xl">{post.title}</h2>
          <div className="flex gap-2 text-sm opacity-70 mb-2">
            <span>Posted by {post.author || "Anonymous"}</span>
            {post.created_at && <span>• {post.created_at}</span>}
          </div>
          <p className="whitespace-pre-wrap">{post.body}</p>
        </div>
      </div>

      {/* Comments Section */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title">
            Comments ({comments.length})
          </h3>

          {/* Comment Form */}
          <form onSubmit={submitComment} className="mb-6">
            {errorMsg && (
              <div className="alert alert-error py-2 mb-3">
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="form-control">
              <textarea
                className="textarea textarea-bordered"
                placeholder="Write a comment..."
                rows={3}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
            </div>

            <div className="form-control mt-3">
              <button
                type="submit"
                className={`btn btn-primary btn-sm ${submitting ? "loading" : ""}`}
                disabled={submitting || !newComment.trim()}
              >
                {submitting ? "Posting..." : "Post Comment"}
              </button>
            </div>
          </form>

          {/* Comments List */}
          {comments.length === 0 ? (
            <p className="text-center opacity-70 py-4">No comments yet. Be the first!</p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="p-4 bg-base-200 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold">{comment.author || "Anonymous"}</span>
                    <span className="text-xs opacity-70">{comment.created_at}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{comment.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
