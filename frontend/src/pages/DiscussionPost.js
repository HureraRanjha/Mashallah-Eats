import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import { useAuth } from "../context/AuthContext";

export default function DiscussionPost() {
  const { id } = useParams();
  const { user, getUserType } = useAuth();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const userType = getUserType();
  const currentUsername = user?.user?.username || user?.username || "";
  const canReport = userType === "registered" || userType === "vip";

  // Build report URL with query params
  const getReportUrl = (authorUsername, contentPreview) => {
    const params = new URLSearchParams({
      targetType: "customer",
      username: authorUsername,
      context: contentPreview.substring(0, 100) + (contentPreview.length > 100 ? "..." : ""),
    });
    return `/complaint?${params.toString()}`;
  };

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
          <div className="flex justify-between items-start">
            <h2 className="card-title text-2xl">{post.title}</h2>
            {/* Report button - only show if can report and not own post */}
            {canReport && post.author && post.author !== currentUsername && (
              <Link
                to={getReportUrl(post.author, `Post: ${post.title}\n${post.body}`)}
                className="btn btn-ghost btn-sm text-error"
                title="Report this post"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
                Report
              </Link>
            )}
          </div>
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
                    <div className="flex items-center gap-2">
                      <span className="text-xs opacity-70">{comment.created_at}</span>
                      {/* Report button for comment */}
                      {canReport && comment.author && comment.author !== currentUsername && (
                        <Link
                          to={getReportUrl(comment.author, `Comment on "${post.title}":\n${comment.body}`)}
                          className="btn btn-ghost btn-xs text-error"
                          title="Report this comment"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                          </svg>
                        </Link>
                      )}
                    </div>
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
