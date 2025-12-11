import React, { useState } from "react";
import { API_BASE_URL } from "../../config";

export default function KBModerationTab({ flaggedKB, onRefresh, onMessage }) {
  const [actionLoading, setActionLoading] = useState(false);

  const handleRemoveKBEntry = async (entryId, banAuthor) => {
    // Only show confirmation if banning author
    if (banAuthor && !window.confirm("Are you sure you want to remove this entry AND ban the author?")) {
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/kb/manage/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          entry_id: entryId,
          ban_author: banAuthor,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        onMessage("success", banAuthor ? "Entry removed and author banned" : "Entry removed");
        onRefresh();
      } else {
        onMessage("error", data.error || "Failed to remove entry");
      }
    } catch (error) {
      onMessage("error", "Server error");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold">Knowledge Base Moderation</h3>
      <p className="opacity-70">Review and remove flagged KB entries (rated 0 stars)</p>

      {flaggedKB.length === 0 ? (
        <div className="text-center py-8 opacity-70">No flagged entries</div>
      ) : (
        <div className="space-y-4">
          {flaggedKB.map((entry) => (
            <div key={entry.id} className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-bold">Q: {entry.question}</h4>
                    <p className="mt-2">A: {entry.answer}</p>
                    <p className="text-sm opacity-70 mt-2">
                      Author: {entry.author} | Flags: {entry.flagged_count} | {entry.created_at}
                    </p>
                  </div>
                  <span className="badge badge-error">Flagged</span>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    className="btn btn-error btn-sm"
                    onClick={() => handleRemoveKBEntry(entry.id, true)}
                    disabled={actionLoading}
                  >
                    Remove & Ban Author
                  </button>
                  <button
                    className="btn btn-warning btn-sm"
                    onClick={() => handleRemoveKBEntry(entry.id, false)}
                    disabled={actionLoading}
                  >
                    Remove Only
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
