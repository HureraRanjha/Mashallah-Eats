import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../config";

export default function DiscussionBoard() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/discussion_board/`, {
        credentials: "include",
      });
      const data = await res.json();
      setTopics(data.titles || []);
    } catch (err) {
      console.log("Failed to load topics");
    } finally {
      setLoading(false);
    }
  };

  const getTopicBadge = (topicType) => {
    switch (topicType) {
      case 'chef': return <span className="badge badge-primary">Chef</span>;
      case 'dish': return <span className="badge badge-secondary">Dish</span>;
      case 'delivery': return <span className="badge badge-accent">Delivery</span>;
      default: return <span className="badge">General</span>;
    }
  };

  if (loading) return <div className="p-6 text-center">Loading...</div>;

  return (
    <div className="container mx-auto max-w-3xl p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Discussion Board</h2>
        <Link to="/discussion/new" className="btn btn-primary">
          + New Topic
        </Link>
      </div>

      <p className="mb-4 opacity-70">
        Discuss chefs, dishes, and delivery experiences with other customers
      </p>

      {topics.length === 0 ? (
        <div className="card bg-base-100 shadow-lg p-8 text-center">
          <p className="opacity-70">No discussion topics yet.</p>
          <p className="text-sm mt-2">Be the first to start a discussion!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {topics.map((topic) => (
            <Link
              key={topic.id}
              to={`/discussion/${topic.id}`}
              className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <h3 className="card-title text-lg">{topic.title}</h3>
                  {getTopicBadge(topic.topic_type)}
                </div>
                <div className="flex gap-4 text-sm opacity-70 mt-2">
                  <span>By {topic.author_name || "Anonymous"}</span>
                  <span>•</span>
                  <span>{topic.post_count || 0} posts</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
