import React, { useState } from "react";

export default function DiscussionSummaryTab({ summaries, onRefresh, onMessage }) {
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await onRefresh();
      onMessage("success", "Summaries generated!");
    } catch (error) {
      onMessage("error", "Failed to generate summaries");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h3 className="text-xl font-bold">AI Discussion Summaries</h3>
          <p className="text-sm opacity-70">AI-generated summaries of all discussion topics</p>
        </div>
        <button
          className={`btn btn-primary ${loading ? "loading" : ""}`}
          onClick={handleRefresh}
          disabled={loading}
        >
          {loading ? "Generating..." : "Generate Summaries"}
        </button>
      </div>

      {summaries.length === 0 ? (
        <div className="text-center py-12">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto opacity-30 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="opacity-70">No discussion summaries available yet.</p>
          <p className="text-sm opacity-50 mt-2">Click "Generate Summaries" to create AI summaries of all discussion topics.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {summaries.map((summary, index) => (
            <div key={index} className="card bg-base-200 shadow-lg">
              <div className="card-body">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="card-title text-lg mb-2">{summary.topic_title}</h4>
                    {summary.related_dish && (
                      <span className="badge badge-primary mb-3">Dish: {summary.related_dish}</span>
                    )}
                  </div>
                </div>

                <div className="bg-base-100 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-info mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <div>
                      <p className="text-xs text-info font-semibold mb-1">AI Summary</p>
                      <p className="text-sm leading-relaxed">{summary.AI_summary}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="alert alert-info">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>These AI-generated summaries help you quickly understand what customers are discussing without reading every post. Click "Generate Summaries" to get the latest.</span>
      </div>
    </div>
  );
}
