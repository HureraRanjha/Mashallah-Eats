import React from "react";

export default function RatingsTab({ ratings }) {
  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <span key={i} className={i < rating ? "text-warning" : "text-base-300"}>
        ★
      </span>
    ));
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold">My Ratings</h3>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="stat bg-base-100 shadow rounded-lg">
          <div className="stat-title">Average Rating</div>
          <div className="stat-value text-warning">
            {ratings.stats?.average_rating > 0 ? ratings.stats.average_rating.toFixed(1) : "N/A"}
            <span className="text-2xl ml-1">★</span>
          </div>
          <div className="stat-desc">{ratings.stats?.total_ratings || 0} total ratings</div>
        </div>

        <div className="stat bg-base-100 shadow rounded-lg">
          <div className="stat-title">Items Rated</div>
          <div className="stat-value text-primary">
            {ratings.item_breakdown?.length || 0}
          </div>
          <div className="stat-desc">menu items have been rated</div>
        </div>
      </div>

      {/* Per-Item Breakdown */}
      {ratings.item_breakdown?.length > 0 && (
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h4 className="card-title text-lg">Rating by Item</h4>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Avg Rating</th>
                    <th>Total Ratings</th>
                  </tr>
                </thead>
                <tbody>
                  {ratings.item_breakdown.map((item, idx) => (
                    <tr key={idx}>
                      <td className="font-semibold">{item.name}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          {renderStars(Math.round(item.average_rating || 0))}
                          <span className="ml-2">{item.average_rating > 0 ? item.average_rating.toFixed(1) : "N/A"}</span>
                        </div>
                      </td>
                      <td>{item.total_ratings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Recent Ratings */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h4 className="card-title text-lg">Recent Ratings</h4>
          {ratings.ratings?.length === 0 ? (
            <div className="text-center py-4 opacity-70">
              No ratings yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Customer</th>
                    <th>Rating</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {ratings.ratings?.map((rating) => (
                    <tr key={rating.id}>
                      <td>{rating.menu_item}</td>
                      <td>{rating.customer}</td>
                      <td>
                        <div className="flex items-center">
                          {renderStars(rating.rating)}
                        </div>
                      </td>
                      <td className="text-sm opacity-70">{rating.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
