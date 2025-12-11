import React, { useState } from "react";
import { API_BASE_URL } from "../../config";

export default function RegistrationsTab({ registrations, onRefresh, onMessage }) {
  const [actionLoading, setActionLoading] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const handleApproveRegistration = async () => {
    setActionLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/registration/process/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          request_id: selectedItem.id,
          decision: "approved",
        }),
      });

      const data = await res.json();

      if (res.ok) {
        onMessage("success", "Registration approved successfully!");
        setShowApproveModal(false);
        setSelectedItem(null);
        onRefresh();
      } else {
        onMessage("error", data.error || "Failed to approve registration");
      }
    } catch (error) {
      onMessage("error", "Server error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectRegistration = async (requestId) => {
    setActionLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/registration/process/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          request_id: requestId,
          decision: "rejected",
        }),
      });

      const data = await res.json();

      if (res.ok) {
        onMessage("success", "Registration rejected");
        onRefresh();
      } else {
        onMessage("error", data.error || "Failed to reject registration");
      }
    } catch (error) {
      onMessage("error", "Server error");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold">Pending Registration Requests</h3>

      {registrations.length === 0 ? (
        <div className="text-center py-8 opacity-70">No pending registration requests</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="bg-base-200">
                <th>Username</th>
                <th>Name</th>
                <th>Email</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((req) => (
                <tr key={req.id} className={req.is_blacklisted ? "bg-error/10" : ""}>
                  <td className="font-semibold">{req.username}</td>
                  <td>{req.first_name} {req.last_name}</td>
                  <td>
                    {req.email}
                    {req.is_blacklisted && (
                      <span className="badge badge-error badge-sm ml-2">BLACKLISTED</span>
                    )}
                  </td>
                  <td>{req.created_at}</td>
                  <td className="flex gap-2">
                    {req.is_blacklisted ? (
                      <span className="text-error text-sm">Cannot approve - blacklisted</span>
                    ) : (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => {
                          setSelectedItem(req);
                          setShowApproveModal(true);
                        }}
                        disabled={actionLoading}
                      >
                        Approve
                      </button>
                    )}
                    <button
                      className="btn btn-error btn-sm"
                      onClick={() => handleRejectRegistration(req.id)}
                      disabled={actionLoading}
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {showApproveModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Approve Registration</h3>
            <div className="py-4">
              <p className="mb-2">Are you sure you want to approve this registration?</p>
              <div className="bg-base-200 p-3 rounded-lg">
                <p><strong>Username:</strong> {selectedItem?.username}</p>
                <p><strong>Name:</strong> {selectedItem?.first_name} {selectedItem?.last_name}</p>
                <p><strong>Email:</strong> {selectedItem?.email}</p>
              </div>
              <p className="text-sm opacity-70 mt-3">
                The user will be able to log in with the password they provided during registration.
              </p>
            </div>

            <div className="modal-action">
              <button
                className={`btn btn-success ${actionLoading ? "loading" : ""}`}
                onClick={handleApproveRegistration}
                disabled={actionLoading}
              >
                Approve
              </button>
              <button
                className="btn"
                onClick={() => {
                  setShowApproveModal(false);
                  setSelectedItem(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
