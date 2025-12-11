import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config";

export default function Profile() {
  const { user, getUserType } = useAuth();

  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchProfile();
    fetchOrders();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/profile/`, {
        credentials: "include",
      });
      const data = await response.json();

      if (response.ok) {
        setProfile(data);
      } else {
        setErrorMsg(data.error || "Failed to load profile");
      }
    } catch (error) {
      console.error(error);
      setErrorMsg("Server error");
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/history/`, {
        credentials: "include",
      });
      const data = await response.json();

      if (response.ok) {
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error("Failed to load orders:", error);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading profile...</div>;
  }

  if (errorMsg) {
    return <div className="p-6 text-center text-error">{errorMsg}</div>;
  }

  const userType = getUserType();
  const isCustomer = userType === "registered" || userType === "vip";
  const customerData = profile?.customer;

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h2 className="text-3xl font-bold mb-6">My Profile</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Info Card */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title">Account Info</h3>

            <div className="space-y-2">
              <p><span className="font-semibold">Username:</span> {profile?.username}</p>
              <p><span className="font-semibold">Email:</span> {profile?.email}</p>
              <p>
                <span className="font-semibold">Status:</span>{" "}
                {userType === "vip" ? (
                  <span className="badge badge-warning">VIP</span>
                ) : (
                  <span className="badge badge-info">{userType}</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Customer Stats Card */}
        {isCustomer && customerData && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title">Account Stats</h3>

              {/* Warnings Alert */}
              {customerData.warnings_count > 0 && (
                <div className="alert alert-warning mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>You have {customerData.warnings_count} warning(s)</span>
                </div>
              )}

              <div className="stats stats-vertical shadow">
                <div className="stat">
                  <div className="stat-title">Balance</div>
                  <div className="stat-value text-primary">${customerData.deposit_balance}</div>
                  <div className="stat-actions">
                    <Link to="/deposit" className="btn btn-sm btn-success">Add Funds</Link>
                  </div>
                </div>

                <div className="stat">
                  <div className="stat-title">Total Spent</div>
                  <div className="stat-value">${customerData.total_spent}</div>
                </div>

                <div className="stat">
                  <div className="stat-title">Orders</div>
                  <div className="stat-value">{customerData.order_count}</div>
                </div>
              </div>

              {/* VIP Progress */}
              {userType === "registered" && (
                <div className="mt-4">
                  <p className="text-sm font-semibold mb-2">VIP Progress</p>
                  <progress
                    className="progress progress-warning w-full"
                    value={Math.min(customerData.total_spent, 100)}
                    max="100"
                  ></progress>
                  <p className="text-xs opacity-70 mt-1">
                    ${customerData.total_spent} / $100 spent (or {customerData.order_count}/3 orders)
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Order History */}
      {isCustomer && (
        <div className="card bg-base-100 shadow-xl mt-6">
          <div className="card-body">
            <h3 className="card-title">Order History</h3>

            {orders.length === 0 ? (
              <p className="text-center opacity-70 py-4">No orders yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr key={order.order_id}>
                        <td>#{order.order_id}</td>
                        <td className="max-w-xs truncate">{order.items_summary}</td>
                        <td>${order.total_price}</td>
                        <td>
                          <span className={`badge ${
                            order.status === "Delivered" ? "badge-success" :
                            order.status === "Pending" ? "badge-warning" :
                            "badge-info"
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td>{order.date}</td>
                        <td>
                          <div className="flex gap-1">
                            <Link to={`/rate/${order.order_id}`} className="btn btn-xs btn-outline">
                              Rate
                            </Link>
                            <Link to={`/complaint?order=${order.order_id}`} className="btn btn-xs btn-ghost">
                              Report
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
