// frontend/src/pages/DiscussionBoard.js
import React from 'react';

export default function DiscussionBoard() {
  // hardcoded dummy posts
  const posts = [
    { id: 1, title: "How many chicken nuggets?", body: "How can ahmed eat that many chicken nuggets?", comments: 5 },
    { id: 2, title: "New dish ideas", body: "We should try a fusion menu for next week.", comments: 2 },
    { id: 3, title: "Kitchen safety tips", body: "Any tips to avoid burning yourself?", comments: 3 },
  ];

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <h2 className="text-3xl font-bold mb-6 text-center">Discussion Board</h2>
      
      <div className="flex flex-col gap-6">
        {posts.map((post) => (
          <div key={post.id} className="card bg-base-100 shadow-xl p-4">
            <h3 className="text-xl font-bold mb-2">{post.title}</h3>
            <p className="mb-2">{post.body}</p>
            <div className="flex justify-between items-center">
              <span className="text-sm opacity-70">{post.comments} comments</span>
              <button className="btn btn-primary btn-sm">View Comments</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}