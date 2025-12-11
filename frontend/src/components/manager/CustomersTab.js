import React, { useState } from "react";
import { API_BASE_URL } from "../../config";

export default function CustomersTab({ customers, onRefresh, onMessage }) {
  const [actionLoading, setActionLoading] = useState(false);

  const handleCloseAccount = async (customerId) => {
    if (!window.confirm("Are you sure you want to close this account? The deposit will be cleared.")) {
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/account/close/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          customer_id: customerId,
          reason: "manager_closed",
        }),
      });

      const data = await res.json();

      if (res.ok) {
        onMessage("success", `Account closed. Cleared deposit: $${data.cleared_amount || 0}`);
        onRefresh();
      } else {
        onMessage("error", data.error || "Failed to close account");
      }
    } catch (error) {
      onMessage("error", "Server error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleBlacklist = async (customerId, currentlyBlacklisted) => {
    const action = currentlyBlacklisted ? "unblacklist" : "blacklist";

    setActionLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/blacklist/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          customer_id: customerId,
          action: action,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        onMessage("success", data.message);
        onRefresh();
      } else {
        onMessage("error", data.error || `Failed to ${action} user`);
      }
    } catch (error) {
      onMessage("error", "Server error");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold">Customer Management</h3>

      {customers.length === 0 ? (
        <div className="text-center py-8 opacity-70">No customers found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="bg-base-200">
                <th>Username</th>
                <th>Status</th>
                <th>Balance</th>
                <th>Warnings</th>
                <th>Blacklisted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td className="font-semibold">{customer.username}</td>
                  <td>
                    <span className={`badge ${
                      customer.user_type === "vip" ? "badge-warning" : "badge-primary"
                    }`}>
                      {customer.user_type?.toUpperCase() || "REGISTERED"}
                    </span>
                  </td>
                  <td>${parseFloat(customer.deposit_balance || 0).toFixed(2)}</td>
                  <td>
                    {(() => {
                      const maxWarnings = customer.user_type === "vip" ? 2 : 3;
                      const isAtMax = customer.warnings_count >= maxWarnings;
                      return (
                        <span className={isAtMax ? "text-error font-bold" : ""}>
                          {customer.warnings_count || 0}/{maxWarnings}
                        </span>
                      );
                    })()}
                  </td>
                  <td>
                    {customer.is_blacklisted ? (
                      <span className="badge badge-error">Yes</span>
                    ) : (
                      <span className="badge badge-ghost">No</span>
                    )}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      {customer.is_blacklisted ? (
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleToggleBlacklist(customer.id, true)}
                          disabled={actionLoading}
                        >
                          Unblacklist
                        </button>
                      ) : (
                        <>
                          <button
                            className="btn btn-warning btn-sm"
                            onClick={() => handleToggleBlacklist(customer.id, false)}
                            disabled={actionLoading}
                          >
                            Blacklist
                          </button>
                          <button
                            className="btn btn-error btn-sm"
                            onClick={() => handleCloseAccount(customer.id)}
                            disabled={actionLoading}
                          >
                            Close
                          </button>
                        </>
                      )}
                    </div>
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
