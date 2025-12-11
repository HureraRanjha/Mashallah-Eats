import React, { useState } from "react";
import { API_BASE_URL } from "../../config";

export default function ComplaintsTab({ complaints, onRefresh, onMessage }) {
  const [actionLoading, setActionLoading] = useState(false);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");

  // Filter complaints by status
  const filteredComplaints = statusFilter === "all"
    ? complaints
    : complaints.filter(c => c.status === statusFilter || (statusFilter === "pending" && c.status === "disputed"));

  const handleProcessComplaint = async (complaintId, decision) => {
    setActionLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/complaint/process/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          complaint_id: complaintId,
          decision: decision,
          manager_decision: decisionNotes,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        onMessage("success", `Complaint ${decision}!`);
        setDecisionNotes("");
        onRefresh();
      } else {
        onMessage("error", data.error || "Failed to process complaint");
      }
    } catch (error) {
      onMessage("error", "Server error");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">Complaints Management</h3>
        <div className="flex gap-2">
          <select
            className="select select-bordered select-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="pending">Pending/Disputed</option>
            <option value="upheld">Upheld</option>
            <option value="dismissed">Dismissed</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {filteredComplaints.length === 0 ? (
        <div className="text-center py-8 opacity-70">
          No {statusFilter === "all" ? "" : statusFilter} complaints
        </div>
      ) : (
        <div className="space-y-4">
          {filteredComplaints.map((complaint) => (
            <div key={complaint.id} className="card bg-base-100 shadow-lg">
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    {/* Filed By */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-error">Filed by:</span>
                      <span className="font-bold text-lg">{complaint.complainant}</span>
                      {complaint.is_vip && (
                        <span className="badge badge-warning badge-sm">VIP (2x weight)</span>
                      )}
                    </div>

                    {/* Against */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-semibold">Against:</span>
                      <span className="font-bold">{complaint.target}</span>
                      <span className="badge badge-outline badge-sm">{complaint.target_type}</span>
                    </div>

                    {/* Description */}
                    <div className="bg-base-200 p-3 rounded-lg mb-2">
                      <p className="text-sm font-semibold mb-1">Complaint:</p>
                      <p>{complaint.description}</p>
                    </div>

                    {/* Dispute */}
                    {complaint.dispute_text && (
                      <div className="p-3 bg-info/20 rounded-lg mb-2">
                        <p className="text-sm font-semibold mb-1">Dispute from {complaint.target}:</p>
                        <p>{complaint.dispute_text}</p>
                      </div>
                    )}

                    <p className="text-sm opacity-70">{complaint.created_at}</p>
                  </div>
                  <span className={`badge ${
                    complaint.status === "pending" ? "badge-warning" :
                    complaint.status === "disputed" ? "badge-info" :
                    complaint.status === "upheld" ? "badge-error" :
                    complaint.status === "dismissed" ? "badge-success" : "badge-ghost"
                  }`}>
                    {complaint.status}
                  </span>
                </div>

                {/* Only show actions for pending/disputed complaints */}
                {(complaint.status === "pending" || complaint.status === "disputed") ? (
                  <div className="mt-4">
                    <input
                      type="text"
                      placeholder="Decision notes (optional)"
                      className="input input-bordered input-sm w-full mb-2"
                      value={decisionNotes}
                      onChange={(e) => setDecisionNotes(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        className="btn btn-error btn-sm"
                        onClick={() => handleProcessComplaint(complaint.id, "upheld")}
                        disabled={actionLoading}
                      >
                        Uphold (Add Warning)
                      </button>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleProcessComplaint(complaint.id, "dismissed")}
                        disabled={actionLoading}
                      >
                        Dismiss (Warn Complainant)
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 text-sm opacity-70">
                    <p><strong>Decision:</strong> {complaint.manager_decision || "No notes"}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
