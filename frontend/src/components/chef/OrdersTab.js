import React, { useState } from "react";
import { API_BASE_URL } from "../../config";

export default function OrdersTab({ orders, onRefresh, onMessage }) {
  const [activeSection, setActiveSection] = useState("active");
  const [filterMyItems, setFilterMyItems] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const getStatusBadge = (status) => {
    const badges = {
      pending: "badge-warning",
      preparing: "badge-info",
      ready: "badge-success",
      delivering: "badge-primary",
      delivered: "badge-ghost",
    };
    return badges[status] || "badge-ghost";
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    setActionLoading(orderId);
    try {
      const res = await fetch(`${API_BASE_URL}/chef/orders/update-status/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ order_id: orderId, status: newStatus }),
      });

      const data = await res.json();

      if (res.ok) {
        onMessage("success", `Order #${orderId} marked as ${newStatus}`);
        onRefresh();
      } else {
        onMessage("error", data.error || "Failed to update order");
      }
    } catch (error) {
      onMessage("error", "Server error");
    } finally {
      setActionLoading(null);
    }
  };

  const allOrders = activeSection === "active" ? orders.active : orders.completed;
  const displayOrders = filterMyItems
    ? allOrders?.filter(order => order.has_my_items)
    : allOrders;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="text-xl font-bold">All Orders</h3>
        <div className="flex gap-2 items-center">
          <label className="label cursor-pointer gap-2">
            <span className="label-text">My items only</span>
            <input
              type="checkbox"
              className="checkbox checkbox-sm checkbox-primary"
              checked={filterMyItems}
              onChange={(e) => setFilterMyItems(e.target.checked)}
            />
          </label>
          <div className="btn-group">
            <button
              className={`btn btn-sm ${activeSection === "active" ? "btn-active" : ""}`}
              onClick={() => setActiveSection("active")}
            >
              Active ({orders.active?.length || 0})
            </button>
            <button
              className={`btn btn-sm ${activeSection === "completed" ? "btn-active" : ""}`}
              onClick={() => setActiveSection("completed")}
            >
              Completed ({orders.completed?.length || 0})
            </button>
          </div>
        </div>
      </div>

      {displayOrders?.length === 0 ? (
        <div className="text-center py-8 opacity-70">
          No {activeSection} orders {filterMyItems && "with your items"}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="bg-base-200">
                <th>Order ID</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Address</th>
                <th>Status</th>
                <th>Total</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {displayOrders?.map((order) => (
                <tr key={order.id} className={order.has_my_items ? "bg-primary/10" : ""}>
                  <td className="font-mono">
                    #{order.id}
                    {order.has_my_items && (
                      <span className="badge badge-primary badge-xs ml-2">My Order</span>
                    )}
                  </td>
                  <td>{order.customer_name}</td>
                  <td>
                    <div className="text-sm">
                      {order.items?.map((item, idx) => (
                        <div
                          key={idx}
                          className={item.is_mine ? "font-semibold text-primary" : "opacity-70"}
                        >
                          {item.quantity}x {item.name}
                          {!item.is_mine && (
                            <span className="text-xs ml-1">({item.chef_name})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="text-sm max-w-xs truncate">{order.delivery_address}</td>
                  <td>
                    <span className={`badge ${getStatusBadge(order.status)}`}>
                      {order.status?.toUpperCase()}
                    </span>
                  </td>
                  <td>${parseFloat(order.total_price).toFixed(2)}</td>
                  <td className="text-sm opacity-70">{order.created_at}</td>
                  <td>
                    {order.status === "pending" && (
                      <button
                        className="btn btn-info btn-sm"
                        onClick={() => handleUpdateStatus(order.id, "preparing")}
                        disabled={actionLoading === order.id}
                      >
                        {actionLoading === order.id ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        ) : (
                          "Start Preparing"
                        )}
                      </button>
                    )}
                    {order.status === "preparing" && (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleUpdateStatus(order.id, "ready")}
                        disabled={actionLoading === order.id}
                      >
                        {actionLoading === order.id ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        ) : (
                          "Mark Ready"
                        )}
                      </button>
                    )}
                    {order.status === "ready" && (
                      <span className="text-success text-sm">Ready for pickup</span>
                    )}
                    {order.status === "delivering" && (
                      <span className="text-primary text-sm">Out for delivery</span>
                    )}
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
