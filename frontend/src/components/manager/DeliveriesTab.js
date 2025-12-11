import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../../config";

export default function DeliveriesTab({ pendingDeliveries, onRefresh, onMessage }) {
  const [actionLoading, setActionLoading] = useState(false);
  const [justificationMemo, setJustificationMemo] = useState("");
  const [deliveryPersons, setDeliveryPersons] = useState([]);
  const [manualAssignment, setManualAssignment] = useState({}); // { orderId: { personId, amount } }

  useEffect(() => {
    fetchDeliveryPersons();
  }, []);

  const fetchDeliveryPersons = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/manager/delivery-persons/`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setDeliveryPersons(data.delivery_persons || []);
      }
    } catch (error) {
      console.error("Failed to fetch delivery persons:", error);
    }
  };

  const handleManualAssign = async (orderId) => {
    const assignment = manualAssignment[orderId];
    if (!assignment?.personId || !assignment?.amount) {
      onMessage("error", "Please select a delivery person and enter a delivery fee");
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
          delivery_person_id: assignment.personId,
          delivery_fee: assignment.amount,
          justification_memo: "Manual assignment by manager",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        onMessage("success", "Delivery assigned successfully!");
        setManualAssignment((prev) => ({ ...prev, [orderId]: {} }));
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
            const sortedBids = [...(order.bids || [])].sort((a, b) => parseFloat(a.bid_amount) - parseFloat(b.bid_amount));

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
                              <span className="font-semibold">{bid.delivery_person_name}</span>
                              <span className="ml-2">${parseFloat(bid.bid_amount).toFixed(2)}</span>
                              {bid.delivery_person_rating && (
                                <span className="ml-2 text-warning">★ {parseFloat(bid.delivery_person_rating).toFixed(1)}</span>
                              )}
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

                  {/* Manual Assignment Section */}
                  <div className="divider">Or Assign Manually</div>
                  <div className="flex flex-wrap gap-3 items-end">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Delivery Person</span>
                      </label>
                      <select
                        className="select select-bordered select-sm"
                        value={manualAssignment[order.id]?.personId || ""}
                        onChange={(e) =>
                          setManualAssignment((prev) => ({
                            ...prev,
                            [order.id]: { ...prev[order.id], personId: e.target.value },
                          }))
                        }
                      >
                        <option value="">Select person...</option>
                        {deliveryPersons.map((dp) => (
                          <option key={dp.id} value={dp.id}>
                            {dp.username} {dp.average_rating ? `(★ ${parseFloat(dp.average_rating).toFixed(1)})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Delivery Fee ($)</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="input input-bordered input-sm w-24"
                        value={manualAssignment[order.id]?.amount || ""}
                        onChange={(e) =>
                          setManualAssignment((prev) => ({
                            ...prev,
                            [order.id]: { ...prev[order.id], amount: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleManualAssign(order.id)}
                      disabled={actionLoading}
                    >
                      Assign Manually
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
