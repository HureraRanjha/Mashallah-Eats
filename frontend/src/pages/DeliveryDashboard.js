import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import {
  AvailableOrdersTab,
  ActiveDeliveriesTab,
  HistoryTab,
  StatsTab,
  KnowledgeTab,
} from "../components/delivery";

export default function DeliveryDashboard() {
  const { section } = useParams();
  const navigate = useNavigate();

  // Default to available if no section specified
  const activeTab = section || "available";

  // Redirect old route to new route
  useEffect(() => {
    if (!section) {
      navigate("/delivery/available", { replace: true });
    }
  }, [section, navigate]);

  // Data states
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myBids, setMyBids] = useState([]);
  const [activeDeliveries, setActiveDeliveries] = useState([]);
  const [completedDeliveries, setCompletedDeliveries] = useState([]);
  const [stats, setStats] = useState(null);
  const [kbEntries, setKbEntries] = useState([]);

  // Loading & messages
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Fetch data when tab changes
  useEffect(() => {
    fetchDataForTab(activeTab);
  }, [activeTab]);

  // Clear success messages after 5 seconds
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const fetchDataForTab = async (tab) => {
    setLoading(true);
    setErrorMsg("");

    try {
      switch (tab) {
        case "available":
          await fetchAvailableOrders();
          await fetchMyBids();
          break;
        case "active":
          await fetchMyDeliveries();
          break;
        case "history":
          await fetchMyDeliveries();
          break;
        case "stats":
          await fetchStats();
          break;
        case "knowledge":
          await fetchKBEntries();
          break;
        default:
          break;
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setErrorMsg("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch functions
  const fetchAvailableOrders = async () => {
    const res = await fetch(`${API_BASE_URL}/delivery/available/`, {
      credentials: "include",
    });
    const data = await res.json();
    if (res.ok) setAvailableOrders(data.orders || []);
  };

  const fetchMyBids = async () => {
    const res = await fetch(`${API_BASE_URL}/delivery/my-bids/`, {
      credentials: "include",
    });
    const data = await res.json();
    if (res.ok) setMyBids(data.bids || []);
  };

  const fetchMyDeliveries = async () => {
    const res = await fetch(`${API_BASE_URL}/delivery/my-deliveries/`, {
      credentials: "include",
    });
    const data = await res.json();
    if (res.ok) {
      setActiveDeliveries(data.active || []);
      setCompletedDeliveries(data.completed || []);
    }
  };

  const fetchStats = async () => {
    const res = await fetch(`${API_BASE_URL}/delivery/stats/`, {
      credentials: "include",
    });
    const data = await res.json();
    if (res.ok) setStats(data.stats || null);
  };

  const fetchKBEntries = async () => {
    const res = await fetch(`${API_BASE_URL}/kb/my-entries/`, {
      credentials: "include",
    });
    const data = await res.json();
    if (res.ok) setKbEntries(data.entries || []);
  };

  // Message handler for child components
  const handleMessage = (type, message) => {
    if (type === "error") {
      setErrorMsg(message);
      setSuccessMsg("");
    } else {
      setSuccessMsg(message);
      setErrorMsg("");
    }
  };

  // Refresh handler for child components
  const getRefreshHandler = () => {
    switch (activeTab) {
      case "available": return () => { fetchAvailableOrders(); fetchMyBids(); };
      case "active": return fetchMyDeliveries;
      case "history": return fetchMyDeliveries;
      case "stats": return fetchStats;
      case "knowledge": return fetchKBEntries;
      default: return () => {};
    }
  };

  // Get page title based on active tab
  const getPageTitle = () => {
    const titles = {
      available: "Available Orders",
      active: "Active Deliveries",
      history: "Delivery History",
      stats: "My Stats",
      knowledge: "Knowledge Base",
    };
    return titles[activeTab] || "Delivery Dashboard";
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{getPageTitle()}</h2>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="alert alert-error mb-4">
          <span>{errorMsg}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setErrorMsg("")}>x</button>
        </div>
      )}
      {successMsg && (
        <div className="alert alert-success mb-4">
          <span>{successMsg}</span>
        </div>
      )}

      {/* Content */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-8">
              <span className="loading loading-spinner loading-lg"></span>
              <p className="mt-2 opacity-70">Loading...</p>
            </div>
          ) : (
            <>
              {activeTab === "available" && (
                <AvailableOrdersTab
                  availableOrders={availableOrders}
                  myBids={myBids}
                  onRefresh={getRefreshHandler()}
                  onMessage={handleMessage}
                />
              )}
              {activeTab === "active" && (
                <ActiveDeliveriesTab
                  deliveries={activeDeliveries}
                  onRefresh={getRefreshHandler()}
                  onMessage={handleMessage}
                />
              )}
              {activeTab === "history" && (
                <HistoryTab
                  deliveries={completedDeliveries}
                />
              )}
              {activeTab === "stats" && (
                <StatsTab
                  stats={stats}
                />
              )}
              {activeTab === "knowledge" && (
                <KnowledgeTab
                  entries={kbEntries}
                  onRefresh={getRefreshHandler()}
                  onMessage={handleMessage}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
