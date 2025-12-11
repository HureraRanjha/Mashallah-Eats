import React, { useState } from "react";
import { API_BASE_URL } from "../../config";

export default function ComplimentsTab({ compliments, onRefresh, onMessage }) {
  const [actionLoading, setActionLoading] = useState(false);

  const handleApproveCompliment = async (complimentId) => {
    setActionLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/compliment/process/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          compliment_id: complimentId,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        onMessage("success", "Compliment approved!");
        onRefresh();
      } else {
        onMessage("error", data.error || "Failed to approve compliment");
      }
    } catch (error) {
      onMessage("error", "Server error");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold">Pending Compliments</h3>

      {compliments.length === 0 ? (
        <div className="text-center py-8 opacity-70">No pending compliments</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="bg-base-200">
                <th>From</th>
                <th>To</th>
                <th>Type</th>
                <th>Description</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {compliments.map((compliment) => (
                <tr key={compliment.id}>
                  <td>{compliment.author}</td>
                  <td>{compliment.target}</td>
                  <td>
                    <span className="badge badge-outline">{compliment.target_type}</span>
                  </td>
                  <td className="max-w-xs truncate">{compliment.description}</td>
                  <td>{compliment.created_at}</td>
                  <td>
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => handleApproveCompliment(compliment.id)}
                      disabled={actionLoading}
                    >
                      Approve
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
