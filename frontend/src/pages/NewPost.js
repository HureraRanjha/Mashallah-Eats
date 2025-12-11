import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function NewPost() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const navigate = useNavigate();

  const submitPost = async (e) => {
    e.preventDefault();

    const res = await fetch("http://127.0.0.1:8000/api/discussion_board/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title, body }),
    });

    if (res.ok) {
      navigate("/discussion"); // go back
    } else {
      alert("You must be logged in to create posts.");
    }
  };

  return (
    <div className="container mx-auto max-w-2xl p-4">
      <h2 className="text-2xl font-bold mb-4">Create Post</h2>

      <form onSubmit={submitPost} className="card shadow-lg p-4">
        <input
          className="input input-bordered w-full mb-3"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="textarea textarea-bordered w-full mb-3"
          placeholder="Your message..."
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />

        <button className="btn btn-primary w-full">Post</button>
      </form>
    </div>
  );
}