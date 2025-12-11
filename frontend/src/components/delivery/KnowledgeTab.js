import React, { useState } from "react";
import { API_BASE_URL } from "../../config";

export default function KnowledgeTab({ entries, onRefresh, onMessage }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) {
      onMessage("error", "Both question and answer are required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/kb/add/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ question: question.trim(), answer: answer.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        onMessage("success", "Knowledge added successfully");
        setQuestion("");
        setAnswer("");
        if (onRefresh) onRefresh();
      } else {
        onMessage("error", data.error || "Failed to add knowledge");
      }
    } catch (error) {
      onMessage("error", "Server error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold">Knowledge Base</h3>
      <p className="opacity-70">
        Add knowledge about the restaurant to help answer customer questions.
      </p>

      {/* Add New Entry Form */}
      <div className="card bg-base-200 shadow">
        <div className="card-body">
          <h4 className="card-title text-lg">Add New Knowledge</h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Question</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                placeholder="e.g., What are your delivery areas?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Answer</span>
              </label>
              <textarea
                className="textarea textarea-bordered h-24"
                placeholder="e.g., We deliver within a 10km radius of the restaurant..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className={`btn btn-primary ${submitting ? "loading" : ""}`}
              disabled={submitting}
            >
              {submitting ? "Adding..." : "Add Knowledge"}
            </button>
          </form>
        </div>
      </div>

      {/* My Entries */}
      <div className="card bg-base-200 shadow">
        <div className="card-body">
          <h4 className="card-title text-lg">My Contributions</h4>
          {entries && entries.length > 0 ? (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div key={entry.id} className="card bg-base-100 shadow-sm">
                  <div className="card-body p-4">
                    <p className="font-semibold">Q: {entry.question}</p>
                    <p className="opacity-80">A: {entry.answer}</p>
                    <div className="flex items-center gap-2 text-sm opacity-60 mt-2">
                      <span>Rating: {entry.average_rating?.toFixed(1) || "N/A"}</span>
                      {entry.is_flagged && (
                        <span className="badge badge-warning badge-sm">Flagged</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="opacity-70">You haven't added any knowledge yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
