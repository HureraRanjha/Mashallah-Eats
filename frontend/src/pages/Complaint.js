import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

export default function Complaint() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("order");

  // URL params for pre-filling from discussion board reports
  const reportTargetType = searchParams.get("targetType");
  const reportTargetUsername = searchParams.get("username");
  const reportContext = searchParams.get("context");

  const [activeTab, setActiveTab] = useState("file"); // "file" or "my"
  const [type, setType] = useState("complaint"); // "complaint" or "compliment"
  const [targetType, setTargetType] = useState(reportTargetType || "chef"); // "chef", "delivery", "customer"
  const [targetId, setTargetId] = useState(reportTargetUsername || "");
  const [description, setDescription] = useState(reportContext ? `Regarding discussion post/comment:\n"${reportContext}"\n\nReason for report:\n` : "");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Available targets based on type
  const [chefs, setChefs] = useState([]);
  const [deliveryPeople, setDeliveryPeople] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loadingTargets, setLoadingTargets] = useState(false);

  // My complaints (filed by me and against me) and compliments
  const [filedComplaints, setFiledComplaints] = useState([]);
  const [receivedComplaints, setReceivedComplaints] = useState([]);
  const [filedCompliments, setFiledCompliments] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);

  useEffect(() => {
    if (activeTab === "file") {
      fetchTargets();
    } else {
      fetchMyComplaints();
    }
  }, [activeTab, targetType]);

  const fetchTargets = async () => {
    setLoadingTargets(true);
    try {
      // Fetch feedback targets (chefs, delivery people, and customers)
      const response = await fetch(`${API_BASE_URL}/feedback-targets/`, {
        credentials: "include",
      });
      const data = await response.json();

      if (response.ok) {
        setChefs(data.chefs || []);
        setDeliveryPeople(data.delivery_people || []);
        setCustomers(data.customers || []);

        // If coming from a report link, pre-select the customer by username
        if (reportTargetType === "customer" && reportTargetUsername && data.customers) {
          const matchedCustomer = data.customers.find(c => c.username === reportTargetUsername);
          if (matchedCustomer) {
            setTargetId(matchedCustomer.username);
          }
        }
      }
    } catch (error) {
      console.error("Failed to load targets:", error);
    } finally {
      setLoadingTargets(false);
    }
  };

  const fetchMyComplaints = async () => {
    setLoadingComplaints(true);
    try {
      const response = await fetch(`${API_BASE_URL}/my_complaints/`, {
        credentials: "include",
      });
      const data = await response.json();

      if (response.ok) {
        setFiledComplaints(data.filed || []);
        setReceivedComplaints(data.received || []);
        setFiledCompliments(data.compliments || []);
      }
    } catch (error) {
      console.error("Failed to load complaints:", error);
    } finally {
      setLoadingComplaints(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!description.trim()) {
      setErrorMsg("Please provide a description");
      return;
    }

    if (!targetId) {
      setErrorMsg("Please select a person");
      return;
    }

    setLoading(true);

    const endpoint = type === "complaint" ? "complaint" : "compliment";

    try {
      const body = {
        target_type: targetType,
        description: description,
      };

      // Add target ID based on type
      if (targetType === "chef") {
        body.chef_id = parseInt(targetId);
      } else if (targetType === "delivery") {
        body.delivery_id = parseInt(targetId);
      } else if (targetType === "customer") {
        body.customer_username = targetId; // For customers, we use username
      }

      if (orderId) {
        body.order_id = parseInt(orderId);
      }

      const response = await fetch(`${API_BASE_URL}/${endpoint}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMsg(data.message || `${type === "complaint" ? "Complaint" : "Compliment"} submitted successfully!`);
        setDescription("");
        setTargetId("");
        setTimeout(() => navigate("/profile"), 2000);
      } else {
        setErrorMsg(data.error || "Failed to submit");
      }
    } catch (error) {
      console.error(error);
      setErrorMsg("Server error");
    } finally {
      setLoading(false);
    }
  };

  const disputeComplaint = async (complaintId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/complaint/dispute/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ complaint_id: complaintId }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMsg("Dispute filed successfully");
        fetchMyComplaints();
      } else {
        setErrorMsg(data.error || "Failed to dispute");
      }
    } catch (error) {
      setErrorMsg("Server error");
    }
  };

  const getTargetOptions = () => {
    if (targetType === "chef") {
      return chefs.map(c => ({ id: c.id, name: c.username }));
    } else if (targetType === "delivery") {
      return deliveryPeople.map(d => ({ id: d.id, name: d.username }));
    } else if (targetType === "customer") {
      return customers.map(c => ({ id: c.username, name: c.username }));
    }
    return [];
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h2 className="text-3xl font-bold mb-6">Feedback Center</h2>

      {/* Tabs */}
      <div className="tabs tabs-boxed mb-6">
        <button
          className={`tab ${activeTab === "file" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("file")}
        >
          File Feedback
        </button>
        <button
          className={`tab ${activeTab === "my" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("my")}
        >
          My Feedback
        </button>
      </div>

      {errorMsg && (
        <div className="alert alert-error mb-4">
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success mb-4">
          <span>{successMsg}</span>
        </div>
      )}

      {activeTab === "file" ? (
        <div className="card bg-base-100 shadow-xl">
          <form className="card-body" onSubmit={handleSubmit}>
            {/* Type Toggle */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Feedback Type</span>
              </label>
              <div className="flex gap-4">
                <label className="label cursor-pointer gap-2">
                  <input
                    type="radio"
                    name="type"
                    className="radio radio-error"
                    checked={type === "complaint"}
                    onChange={() => setType("complaint")}
                  />
                  <span>Complaint</span>
                </label>
                <label className="label cursor-pointer gap-2">
                  <input
                    type="radio"
                    name="type"
                    className="radio radio-success"
                    checked={type === "compliment"}
                    onChange={() => setType("compliment")}
                  />
                  <span>Compliment</span>
                </label>
              </div>
            </div>

            {/* Target Type */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">About who?</span>
              </label>
              <select
                className="select select-bordered"
                value={targetType}
                onChange={(e) => {
                  setTargetType(e.target.value);
                  setTargetId("");
                }}
              >
                <option value="chef">Chef</option>
                <option value="delivery">Delivery Person</option>
                <option value="customer">Another Customer (Forum behavior)</option>
              </select>
            </div>

            {/* Target Person Selection */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">
                  Select {targetType === "chef" ? "Chef" : targetType === "delivery" ? "Delivery Person" : "Customer"}
                </span>
              </label>
              {loadingTargets ? (
                <div className="text-center py-2">Loading...</div>
              ) : (
                <select
                  className="select select-bordered"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                >
                  <option value="">-- Select --</option>
                  {getTargetOptions().map(target => (
                    <option key={target.id} value={target.id}>
                      {target.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Order Reference */}
            {orderId && (
              <div className="alert alert-info">
                <span>Regarding Order #{orderId}</span>
              </div>
            )}

            {/* Description */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Description</span>
              </label>
              <textarea
                className="textarea textarea-bordered h-32"
                placeholder={`Describe your ${type}...`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Submit */}
            <div className="form-control mt-4">
              <button
                type="submit"
                className={`btn ${type === "complaint" ? "btn-error" : "btn-success"} ${loading ? "loading" : ""}`}
                disabled={loading}
              >
                {loading ? "Submitting..." : `Submit ${type === "complaint" ? "Complaint" : "Compliment"}`}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Complaints I Filed */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title">Complaints I Filed</h3>
              <p className="text-sm opacity-70 mb-4">Track the status of complaints you've submitted</p>

              {loadingComplaints ? (
                <div className="text-center py-4">Loading...</div>
              ) : filedComplaints.length === 0 ? (
                <div className="text-center py-4 opacity-70">You haven't filed any complaints</div>
              ) : (
                <div className="space-y-4">
                  {filedComplaints.map((complaint) => (
                    <div key={complaint.id} className="p-4 bg-base-200 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{complaint.description}</p>
                          <p className="text-sm opacity-70">
                            Against: {complaint.target} ({complaint.target_type}) | {complaint.created_at}
                          </p>
                          <span className={`badge mt-2 ${
                            complaint.status === "pending" ? "badge-warning" :
                            complaint.status === "upheld" ? "badge-success" :
                            complaint.status === "dismissed" ? "badge-error" :
                            "badge-ghost"
                          }`}>
                            {complaint.status}
                          </span>
                          {complaint.manager_decision && (
                            <p className="text-sm mt-2 italic">
                              Manager's decision: {complaint.manager_decision}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Compliments I Gave */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title text-success">Compliments I Gave</h3>
              <p className="text-sm opacity-70 mb-4">Track the compliments you've given to others</p>

              {loadingComplaints ? (
                <div className="text-center py-4">Loading...</div>
              ) : filedCompliments.length === 0 ? (
                <div className="text-center py-4 opacity-70">You haven't given any compliments yet</div>
              ) : (
                <div className="space-y-4">
                  {filedCompliments.map((compliment) => (
                    <div key={compliment.id} className="p-4 bg-success/10 rounded-lg border border-success/20">
                      <div>
                        <p className="font-semibold">{compliment.description}</p>
                        <p className="text-sm opacity-70">
                          To: {compliment.target} ({compliment.target_type}) | {compliment.created_at}
                        </p>
                        <span className={`badge mt-2 ${
                          compliment.status === "pending" ? "badge-warning" :
                          compliment.status === "approved" ? "badge-success" :
                          "badge-ghost"
                        }`}>
                          {compliment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Complaints Against Me */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title">Complaints Against Me</h3>
              <p className="text-sm opacity-70 mb-4">You can dispute complaints you believe are unfair</p>

              {loadingComplaints ? (
                <div className="text-center py-4">Loading...</div>
              ) : receivedComplaints.length === 0 ? (
                <div className="text-center py-4 opacity-70">No complaints against you</div>
              ) : (
                <div className="space-y-4">
                  {receivedComplaints.map((complaint) => (
                    <div key={complaint.id} className="p-4 bg-base-200 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{complaint.description}</p>
                          <p className="text-sm opacity-70">
                            From: {complaint.complainant} | {complaint.created_at}
                          </p>
                          <span className={`badge mt-2 ${
                            complaint.status === "pending" ? "badge-warning" :
                            complaint.status === "upheld" ? "badge-error" :
                            complaint.status === "dismissed" ? "badge-success" :
                            complaint.status === "disputed" ? "badge-info" :
                            "badge-ghost"
                          }`}>
                            {complaint.status}
                          </span>
                          {complaint.manager_decision && (
                            <p className="text-sm mt-2 italic">
                              Manager's decision: {complaint.manager_decision}
                            </p>
                          )}
                        </div>
                        {complaint.can_dispute && (
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => disputeComplaint(complaint.id)}
                          >
                            Dispute
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6">
        <button className="btn btn-outline" onClick={() => navigate("/profile")}>
          Back to Profile
        </button>
      </div>
    </div>
  );
}
