import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config";

export default function Profile() {
  const { user, getUserType, logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Knowledge base contribution
  const [kbQuestion, setKbQuestion] = useState("");
  const [kbAnswer, setKbAnswer] = useState("");
  const [kbSubmitting, setKbSubmitting] = useState(false);

  // Quit account
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [quitting, setQuitting] = useState(false);

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

  const submitKnowledge = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!kbQuestion.trim() || !kbAnswer.trim()) {
      setErrorMsg("Please provide both a question and answer");
      return;
    }

    setKbSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/kb/add/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          question: kbQuestion,
          answer: kbAnswer,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMsg("Knowledge submitted successfully! Thank you for contributing.");
        setKbQuestion("");
        setKbAnswer("");
      } else {
        setErrorMsg(data.error || "Failed to submit knowledge");
      }
    } catch (error) {
      console.error(error);
      setErrorMsg("Server error");
    } finally {
      setKbSubmitting(false);
    }
  };

  const handleQuitAccount = async () => {
    setQuitting(true);
    setErrorMsg("");

    try {
      const response = await fetch(`${API_BASE_URL}/account/quit/`, {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        logout();
        navigate("/");
      } else {
        setErrorMsg(data.error || "Failed to close account");
        setShowQuitConfirm(false);
      }
    } catch (error) {
      console.error(error);
      setErrorMsg("Server error");
      setShowQuitConfirm(false);
    } finally {
      setQuitting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading profile...</div>;
  }

  if (errorMsg && !profile) {
    return <div className="p-6 text-center text-error">{errorMsg}</div>;
  }

  const userType = getUserType();
  const isCustomer = userType === "registered" || userType === "vip";
  const customerData = profile?.customer;

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h2 className="text-3xl font-bold mb-6">My Profile</h2>

      {errorMsg && (
        <div className="alert alert-error mb-6">
          <span>{errorMsg}</span>
        </div>
      )}

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

              {/* Warnings Status */}
              <div className={`alert mb-4 ${
                customerData.warnings_count >= 2 ? "alert-error" :
                customerData.warnings_count === 1 ? "alert-warning" :
                "alert-success"
              }`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  {customerData.warnings_count > 0 ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                </svg>
                <div>
                  <span className="font-bold">Warnings: {customerData.warnings_count || 0}/{userType === "vip" ? "2" : "3"}</span>
                  <p className="text-sm">
                    {customerData.warnings_count === 0
                      ? "Good standing! Keep it up."
                      : userType === "vip"
                        ? `${2 - customerData.warnings_count} more warning(s) until demotion to regular status.`
                        : `${3 - customerData.warnings_count} more warning(s) until account closure.`
                    }
                  </p>
                </div>
              </div>

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

      {/* Success/Error Messages */}
      {successMsg && (
        <div className="alert alert-success mt-6">
          <span>{successMsg}</span>
        </div>
      )}

      {/* Knowledge Base Contribution */}
      {isCustomer && profile?.can_contribute_knowledge !== false && (
        <div className="card bg-base-100 shadow-xl mt-6">
          <div className="card-body">
            <h3 className="card-title">Share Your Knowledge</h3>
            <p className="text-sm opacity-70 mb-4">
              Help other customers by sharing your observations and tips about our food and restaurant!
            </p>

            <form onSubmit={submitKnowledge}>
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Question (What might others ask?)</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  placeholder="e.g., What's the best dish for spicy food lovers?"
                  value={kbQuestion}
                  onChange={(e) => setKbQuestion(e.target.value)}
                />
              </div>

              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Your Answer / Observation</span>
                </label>
                <textarea
                  className="textarea textarea-bordered h-24"
                  placeholder="Share your experience or tip..."
                  value={kbAnswer}
                  onChange={(e) => setKbAnswer(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className={`btn btn-primary ${kbSubmitting ? "loading" : ""}`}
                disabled={kbSubmitting || !kbQuestion.trim() || !kbAnswer.trim()}
              >
                {kbSubmitting ? "Submitting..." : "Submit Knowledge"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Account Actions */}
      {isCustomer && (
        <div className="card bg-base-100 shadow-xl mt-6">
          <div className="card-body">
            <h3 className="card-title">Account Actions</h3>

            <div className="flex flex-wrap gap-4">
              <Link to="/complaint" className="btn btn-outline">
                Feedback Center
              </Link>
              <Link to="/discussion" className="btn btn-outline">
                Discussion Board
              </Link>

              {!showQuitConfirm ? (
                <button
                  className="btn btn-error btn-outline"
                  onClick={() => setShowQuitConfirm(true)}
                >
                  Close My Account
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-error text-sm">Are you sure? This cannot be undone.</span>
                  <button
                    className={`btn btn-error btn-sm ${quitting ? "loading" : ""}`}
                    onClick={handleQuitAccount}
                    disabled={quitting}
                  >
                    Yes, Close Account
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowQuitConfirm(false)}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
