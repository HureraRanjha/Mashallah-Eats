import React, { useState } from "react";
import { API_BASE_URL } from "../../config";

export default function AvailableOrdersTab({ availableOrders, myBids, onRefresh, onMessage }) {
  const [actionLoading, setActionLoading] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [bidAmount, setBidAmount] = useState("");

  const handlePlaceBid = async () => {
    if (!bidAmount || parseFloat(bidAmount) <= 0) {
      onMessage("error", "Please enter a valid bid amount");
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/bid/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          order: selectedOrder.id,
          bid_amount: parseFloat(bidAmount),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        onMessage("success", "Bid placed successfully!");
        setShowBidModal(false);
        setBidAmount("");
        setSelectedOrder(null);
        onRefresh();
      } else {
        onMessage("error", data.error || data.non_field_errors?.[0] || "Failed to place bid");
      }
    } catch (error) {
      onMessage("error", "Server error");
    } finally {
      setActionLoading(false);
    }
  };

  const openBidModal = (order) => {
    setSelectedOrder(order);
    setBidAmount("");
    setShowBidModal(true);
  };

  return (
    <div className="space-y-6">
      {/* My Pending Bids Section */}
      {myBids.length > 0 && (
        <div>
          <h3 className="text-lg font-bold mb-3">My Pending Bids</h3>
          <div className="overflow-x-auto">
            <table className="table table-sm w-full">
              <thead>
                <tr className="bg-info/10">
                  <th>Order #</th>
                  <th>Items</th>
                  <th>Address</th>
                  <th>Order Total</th>
                  <th>My Bid</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {myBids.map((bid) => (
                  <tr key={bid.id}>
                    <td className="font-semibold">#{bid.order_id}</td>
                    <td className="max-w-xs truncate">{bid.items_summary}</td>
                    <td className="max-w-xs truncate">{bid.delivery_address}</td>
                    <td>${parseFloat(bid.order_total).toFixed(2)}</td>
                    <td className="font-bold text-primary">${parseFloat(bid.bid_amount).toFixed(2)}</td>
                    <td>
                      <span className="badge badge-warning badge-sm">Pending</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divider"></div>
        </div>
      )}

      {/* Available Orders Section */}
      <div>
        <h3 className="text-lg font-bold mb-3">Available Orders for Bidding</h3>

        {availableOrders.length === 0 ? (
          <div className="text-center py-8 opacity-70">No orders available for bidding</div>
        ) : (
          <div className="space-y-4">
            {availableOrders.map((order) => (
              <div key={order.id} className="card bg-base-200 shadow">
                <div className="card-body p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-bold text-lg">Order #{order.id}</span>
                        <span className={`badge badge-sm ${
                          order.status === "ready" ? "badge-success" :
                          order.status === "preparing" ? "badge-warning" :
                          "badge-ghost"
                        }`}>
                          {order.status === "ready" ? "Ready for Pickup" :
                           order.status === "preparing" ? "Chef Preparing" :
                           "Pending"}
                        </span>
                        {order.my_bid && (
                          <span className="badge badge-info">
                            Your Bid: ${parseFloat(order.my_bid.amount).toFixed(2)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm opacity-70 mb-1">
                        <strong>Customer:</strong> {order.customer_name}
                      </p>
                      <p className="text-sm mb-1">
                        <strong>Items:</strong> {order.items_summary}
                      </p>
                      <p className="text-sm mb-1">
                        <strong>Delivery Address:</strong> {order.delivery_address || "Not specified"}
                      </p>
                      <p className="text-sm">
                        <strong>Order Total:</strong> ${parseFloat(order.total_price).toFixed(2)}
                      </p>
                      <p className="text-xs opacity-50 mt-2">{order.created_at}</p>
                    </div>
                    <div>
                      {order.my_bid ? (
                        <span className="text-sm opacity-70">Bid Placed</span>
                      ) : (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => openBidModal(order)}
                          disabled={actionLoading}
                        >
                          Place Bid
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bid Modal */}
      {showBidModal && selectedOrder && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Place Bid - Order #{selectedOrder.id}</h3>

            <div className="py-4">
              <div className="bg-base-200 p-3 rounded-lg mb-4">
                <p><strong>Items:</strong> {selectedOrder.items_summary}</p>
                <p><strong>Delivery to:</strong> {selectedOrder.delivery_address || "Not specified"}</p>
                <p><strong>Order Total:</strong> ${parseFloat(selectedOrder.total_price).toFixed(2)}</p>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Your Bid Amount ($)</span>
                </label>
                <input
                  type="number"
                  placeholder="Enter your delivery fee"
                  className="input input-bordered"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  min="0"
                  step="0.01"
                />
                <label className="label">
                  <span className="label-text-alt opacity-70">
                    This is the delivery fee you want to charge
                  </span>
                </label>
              </div>
            </div>

            <div className="modal-action">
              <button
                className={`btn btn-primary ${actionLoading ? "loading" : ""}`}
                onClick={handlePlaceBid}
                disabled={actionLoading || !bidAmount}
              >
                Submit Bid
              </button>
              <button
                className="btn"
                onClick={() => {
                  setShowBidModal(false);
                  setBidAmount("");
                  setSelectedOrder(null);
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
