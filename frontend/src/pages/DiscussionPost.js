import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function DiscussionPost() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);

  useEffect(() => {
    const loadPost = async () => {
      const res = await fetch(`http://127.0.0.1:8000/api/topic/?post_id=${id}`, {
        credentials: "include",
      });
      const data = await res.json();
      setPost(data.post);
      setComments(data.comments);
    };

    loadPost();
  }, [id]);

  if (!post) return <div>Loading...</div>;

  return (
    <div className="container mx-auto max-w-3xl p-4">
      <h2 className="text-2xl font-bold mb-2">{post.title}</h2>
      <p className="mb-4">{post.body}</p>

      <h3 className="text-xl font-bold mt-6">Comments</h3>

      {comments.length === 0 ? (
        <p className="opacity-70">No comments yet.</p>
      ) : (
        <div className="flex flex-col gap-3 mt-3">
          {comments.map((c) => (
            <div className="card p-3 bg-base-200" key={c.id}>
              {c.body}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}