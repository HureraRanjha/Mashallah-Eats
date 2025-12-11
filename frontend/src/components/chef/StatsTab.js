import React from "react";

export default function StatsTab({ stats }) {
  if (!stats) {
    return (
      <div className="text-center py-8 opacity-70">
        Unable to load stats
      </div>
    );
  }

  const renderStars = (rating) => {
    const numRating = parseFloat(rating) || 0;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`text-2xl ${star <= Math.round(numRating) ? "text-warning" : "text-gray-300"}`}
          >
            ★
          </span>
        ))}
        <span className="ml-2 text-xl">
          {numRating > 0 ? numRating.toFixed(1) : "N/A"}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold">My Profile & Stats</h3>

      {/* Profile Info */}
      <div className="card bg-base-200 shadow">
        <div className="card-body">
          <h4 className="card-title">Profile Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm opacity-70">Username</p>
              <p className="font-semibold text-lg">{stats.username}</p>
            </div>
            <div>
              <p className="text-sm opacity-70">Email</p>
              <p className="font-semibold">{stats.email}</p>
            </div>
            <div>
              <p className="text-sm opacity-70">Salary</p>
              <p className="font-semibold text-lg text-success">
                ${parseFloat(stats.salary || 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm opacity-70">Hired Date</p>
              <p className="font-semibold">
                {stats.hired_at ? new Date(stats.hired_at).toLocaleDateString() : "N/A"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Stats */}
      <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
        <div className="stat">
          <div className="stat-title">Average Rating</div>
          <div className="stat-value">
            {renderStars(stats.average_rating)}
          </div>
          {stats.average_rating < 2 && stats.average_rating > 0 && (
            <div className="stat-desc text-error">Low rating - at risk of demotion</div>
          )}
        </div>

        <div className="stat">
          <div className="stat-title">Menu Items</div>
          <div className="stat-value text-primary">{stats.total_menu_items || 0}</div>
          <div className="stat-desc">dishes on menu</div>
        </div>

        <div className="stat">
          <div className="stat-title">Total Orders</div>
          <div className="stat-value text-secondary">{stats.total_orders || 0}</div>
          <div className="stat-desc">orders fulfilled</div>
        </div>
      </div>

      {/* Reputation Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Complaints */}
        <div className={`card shadow ${stats.complaint_count >= 3 ? "bg-error/20" : stats.complaint_count >= 2 ? "bg-warning/20" : "bg-base-100"}`}>
          <div className="card-body">
            <h4 className="card-title text-sm">Complaints</h4>
            <p className={`text-3xl font-bold ${stats.complaint_count >= 3 ? "text-error" : stats.complaint_count >= 2 ? "text-warning" : ""}`}>
              {stats.complaint_count || 0}/3
            </p>
            {stats.complaint_count >= 2 && (
              <p className="text-sm text-warning">
                {stats.complaint_count >= 3 ? "At max - demotion pending" : "At risk of demotion"}
              </p>
            )}
          </div>
        </div>

        {/* Compliments */}
        <div className={`card shadow ${stats.compliment_count >= 3 ? "bg-success/20" : "bg-base-100"}`}>
          <div className="card-body">
            <h4 className="card-title text-sm">Compliments</h4>
            <p className={`text-3xl font-bold ${stats.compliment_count >= 3 ? "text-success" : ""}`}>
              {stats.compliment_count || 0}
            </p>
            {stats.compliment_count >= 3 && (
              <p className="text-sm text-success">Eligible for bonus!</p>
            )}
          </div>
        </div>

        {/* Demotions */}
        <div className={`card shadow ${stats.demotion_count >= 2 ? "bg-error/20" : stats.demotion_count >= 1 ? "bg-warning/20" : "bg-base-100"}`}>
          <div className="card-body">
            <h4 className="card-title text-sm">Demotions</h4>
            <p className={`text-3xl font-bold ${stats.demotion_count >= 2 ? "text-error" : stats.demotion_count >= 1 ? "text-warning" : ""}`}>
              {stats.demotion_count || 0}/2
            </p>
            {stats.demotion_count >= 1 && (
              <p className="text-sm text-warning">
                {stats.demotion_count >= 2 ? "Eligible for termination" : "One more = termination"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Performance Tips */}
      <div className="card bg-base-200 shadow">
        <div className="card-body">
          <h4 className="card-title text-sm">Performance Guidelines</h4>
          <ul className="list-disc list-inside text-sm opacity-70 space-y-1">
            <li>3 complaints OR rating below 2.0 = demotion (10% salary cut)</li>
            <li>2 demotions = termination</li>
            <li>3 compliments = bonus from manager</li>
            <li>Rating above 4.0 = eligible for bonus</li>
            <li>Compliments can cancel out complaints</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
