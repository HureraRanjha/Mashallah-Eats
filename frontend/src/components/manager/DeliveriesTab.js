import React, { useState } from "react";
import { API_BASE_URL } from "../../config";

export default function DeliveriesTab({ pendingDeliveries, onRefresh, onMessage }) {
  const [actionLoading, setActionLoading] = useState(false);
  const [justificationMemo, setJustificationMemo] = useState("");

  const handleAssignDelivery = async (orderId, bid, isLowestBid) => {
    if (!isLowestBid && !justificationMemo.trim()) {
      onMessage("error", "Justification memo is required when not selecting the lowest bid");
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/assign_delivery/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          order_id: orderId,
          bid_id: bid.id,
          justification_memo: !isLowestBid ? justificationMemo : undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        onMessage("success", "Delivery assigned successfully!");
        setJustificationMemo("");
        onRefresh();
      } else {
        onMessage("error", data.error || "Failed to assign delivery");
      }
    } catch (error) {
      onMessage("error", "Server error");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold">Delivery Assignment</h3>
      <p className="opacity-70">Assign delivery people to orders based on their bids</p>

      {pendingDeliveries.length === 0 ? (
        <div className="text-center py-8 opacity-70">No orders pending delivery assignment</div>
      ) : (
        <div className="space-y-6">
          {pendingDeliveries.map((order) => {
            const sortedBids = [...(order.bids || [])].sort((a, b) => a.amount - b.amount);

            return (
              <div key={order.id} className="card bg-base-100 shadow-lg">
                <div className="card-body">
                  <h4 className="card-title">Order #{order.id}</h4>
                  <p><strong>Items:</strong> {order.items_summary || order.items?.map(i => i.name).join(", ")}</p>
                  <p><strong>Address:</strong> {order.delivery_address || "Not specified"}</p>
                  <p><strong>Total:</strong> ${order.total_price}</p>

                  <div className="divider">Bids</div>

                  {sortedBids.length === 0 ? (
                    <p className="opacity-70">No bids yet</p>
                  ) : (
                    <div className="space-y-2">
                      {sortedBids.map((bid, index) => {
                        const isLowest = index === 0;
                        return (
                          <div
                            key={bid.id}
                            className={`flex justify-between items-center p-3 rounded-lg ${
                              isLowest ? "bg-success/20 border border-success" : "bg-base-200"
                            }`}
                          >
                            <div>
                              <span className="font-semibold">{bid.delivery_person}</span>
                              <span className="ml-2">${bid.amount}</span>
                              {isLowest && <span className="badge badge-success ml-2">Lowest</span>}
                            </div>
                            <div className="flex gap-2 items-center">
                              {!isLowest && (
                                <input
                                  type="text"
                                  placeholder="Justification required"
                                  className="input input-bordered input-sm w-48"
                                  value={justificationMemo}
                                  onChange={(e) => setJustificationMemo(e.target.value)}
                                />
                              )}
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleAssignDelivery(order.id, bid, isLowest)}
                                disabled={actionLoading}
                              >
                                Assign
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
