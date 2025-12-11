import React, { useState } from "react";
import { API_BASE_URL } from "../../config";

export default function ActiveDeliveriesTab({ deliveries, onRefresh, onMessage }) {
  const [actionLoading, setActionLoading] = useState(false);

  const handleUpdateStatus = async (orderId, newStatus) => {
    setActionLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/delivery/update-status/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          order_id: orderId,
          new_status: newStatus,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        const statusText = newStatus === "delivering" ? "started" : "completed";
        onMessage("success", `Delivery ${statusText}!`);
        onRefresh();
      } else {
        onMessage("error", data.error || "Failed to update status");
      }
    } catch (error) {
      onMessage("error", "Server error");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "preparing":
        return <span className="badge badge-warning">Chef Preparing</span>;
      case "ready":
        return <span className="badge badge-success">Ready for Pickup</span>;
      case "delivering":
        return <span className="badge badge-info">In Transit</span>;
      default:
        return <span className="badge badge-ghost">{status}</span>;
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold">Active Deliveries</h3>
      <p className="opacity-70">Orders you are currently delivering</p>

      {deliveries.length === 0 ? (
        <div className="text-center py-8 opacity-70">
          No active deliveries. Check available orders to place bids!
        </div>
      ) : (
        <div className="space-y-4">
          {deliveries.map((order) => (
            <div key={order.id} className="card bg-base-100 shadow-lg border-l-4 border-primary">
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-xl">Order #{order.id}</span>
                      {getStatusBadge(order.status)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                      <div>
                        <p className="text-sm">
                          <strong>Customer:</strong> {order.customer_name}
                        </p>
                        <p className="text-sm">
                          <strong>Delivery Fee:</strong> ${parseFloat(order.delivery_bid_price || 0).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm">
                          <strong>Order Total:</strong> ${parseFloat(order.total_price).toFixed(2)}
                        </p>
                        <p className="text-xs opacity-50">Placed: {order.created_at}</p>
                      </div>
                    </div>

                    <div className="bg-base-200 p-3 rounded-lg mb-3">
                      <p className="font-semibold mb-1">Delivery Address:</p>
                      <p>{order.delivery_address || "Not specified"}</p>
                    </div>

                    <div className="bg-base-200 p-3 rounded-lg">
                      <p className="font-semibold mb-1">Items:</p>
                      <ul className="list-disc list-inside">
                        {order.items.map((item, idx) => (
                          <li key={idx}>{item.quantity}x {item.name}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="divider my-2"></div>

                <div className="flex gap-2 justify-end items-center">
                  {order.status === "preparing" && (
                    <span className="text-warning text-sm">Waiting for chef to finish...</span>
                  )}
                  {order.status === "ready" && (
                    <button
                      className={`btn btn-info ${actionLoading ? "loading" : ""}`}
                      onClick={() => handleUpdateStatus(order.id, "delivering")}
                      disabled={actionLoading}
                    >
                      Pick Up & Start Delivery
                    </button>
                  )}
                  {order.status === "delivering" && (
                    <button
                      className={`btn btn-success ${actionLoading ? "loading" : ""}`}
                      onClick={() => handleUpdateStatus(order.id, "delivered")}
                      disabled={actionLoading}
                    >
                      Mark Delivered
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
