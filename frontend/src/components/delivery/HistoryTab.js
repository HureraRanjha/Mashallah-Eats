import React from "react";

export default function HistoryTab({ deliveries }) {
  const renderStars = (rating) => {
    if (!rating) return <span className="opacity-50">Not rated</span>;
    return (
      <span className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={star <= rating ? "text-warning" : "text-gray-300"}
          >
            ★
          </span>
        ))}
        <span className="ml-1">({rating}/5)</span>
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold">Delivery History</h3>
      <p className="opacity-70">Your completed deliveries</p>

      {deliveries.length === 0 ? (
        <div className="text-center py-8 opacity-70">
          No completed deliveries yet
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="bg-base-200">
                <th>Order #</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Delivery Fee</th>
                <th>Date</th>
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((order) => (
                <tr key={order.id}>
                  <td className="font-semibold">#{order.id}</td>
                  <td>{order.customer_name}</td>
                  <td className="max-w-xs truncate">{order.items_summary}</td>
                  <td>${parseFloat(order.delivery_bid_price || 0).toFixed(2)}</td>
                  <td>{order.created_at}</td>
                  <td>{renderStars(order.my_rating)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Stats */}
      {deliveries.length > 0 && (
        <div className="stats shadow mt-4">
          <div className="stat">
            <div className="stat-title">Total Deliveries</div>
            <div className="stat-value text-primary">{deliveries.length}</div>
          </div>
          <div className="stat">
            <div className="stat-title">Total Earned</div>
            <div className="stat-value text-success">
              ${deliveries.reduce((sum, d) => sum + parseFloat(d.delivery_bid_price || 0), 0).toFixed(2)}
            </div>
          </div>
          <div className="stat">
            <div className="stat-title">Avg Delivery Fee</div>
            <div className="stat-value">
              ${(deliveries.reduce((sum, d) => sum + parseFloat(d.delivery_bid_price || 0), 0) / deliveries.length).toFixed(2)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
