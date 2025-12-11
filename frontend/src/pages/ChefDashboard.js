import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config";
import { MenuTab, OrdersTab, RatingsTab, StatsTab, KnowledgeTab } from "../components/chef";

export default function ChefDashboard() {
  const { section } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState(section || "menu");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Data states
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState({ active: [], completed: [] });
  const [ratings, setRatings] = useState({ ratings: [], stats: {}, item_breakdown: [] });
  const [stats, setStats] = useState(null);
  const [kbEntries, setKbEntries] = useState([]);

  useEffect(() => {
    if (section && section !== activeTab) {
      setActiveTab(section);
    }
  }, [section]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case "menu":
          await fetchMenu();
          break;
        case "orders":
          await fetchOrders();
          break;
        case "ratings":
          await fetchRatings();
          break;
        case "stats":
          await fetchStats();
          break;
        case "knowledge":
          await fetchKBEntries();
          break;
        default:
          await fetchMenu();
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      showMessage("error", "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const fetchMenu = async () => {
    const res = await fetch(`${API_BASE_URL}/chef/menu/`, {
      credentials: "include",
    });
    const data = await res.json();
    if (res.ok) {
      setMenuItems(data.menu_items || []);
    }
  };

  const fetchOrders = async () => {
    const res = await fetch(`${API_BASE_URL}/chef/orders/`, {
      credentials: "include",
    });
    const data = await res.json();
    if (res.ok) {
      setOrders({ active: data.active || [], completed: data.completed || [] });
    }
  };

  const fetchRatings = async () => {
    const res = await fetch(`${API_BASE_URL}/chef/ratings/`, {
      credentials: "include",
    });
    const data = await res.json();
    if (res.ok) {
      setRatings(data);
    }
  };

  const fetchStats = async () => {
    const res = await fetch(`${API_BASE_URL}/chef/stats/`, {
      credentials: "include",
    });
    const data = await res.json();
    if (res.ok) {
      setStats(data);
    }
  };

  const fetchKBEntries = async () => {
    const res = await fetch(`${API_BASE_URL}/kb/my-entries/`, {
      credentials: "include",
    });
    const data = await res.json();
    if (res.ok) {
      setKbEntries(data.entries || []);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 4000);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    navigate(`/chef/${tab}`);
  };

  const tabs = [
    { id: "menu", label: "My Menu", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
    { id: "orders", label: "Orders", icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" },
    { id: "ratings", label: "My Ratings", icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" },
    { id: "stats", label: "My Stats", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
    { id: "knowledge", label: "Knowledge", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  ];

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-3xl font-bold mb-6">Chef Dashboard</h2>

      {/* Message Display */}
      {message.text && (
        <div className={`alert ${message.type === "error" ? "alert-error" : "alert-success"} mb-4`}>
          <span>{message.text}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tabs tabs-boxed mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab gap-2 ${activeTab === tab.id ? "tab-active" : ""}`}
            onClick={() => handleTabChange(tab.id)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={tab.icon} />
            </svg>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : (
        <div>
          {activeTab === "menu" && (
            <MenuTab
              menuItems={menuItems}
              onRefresh={fetchMenu}
              onMessage={showMessage}
            />
          )}
          {activeTab === "orders" && (
            <OrdersTab
              orders={orders}
              onRefresh={fetchOrders}
              onMessage={showMessage}
            />
          )}
          {activeTab === "ratings" && (
            <RatingsTab ratings={ratings} />
          )}
          {activeTab === "stats" && (
            <StatsTab stats={stats} onRefresh={fetchStats} />
          )}
          {activeTab === "knowledge" && (
            <KnowledgeTab
              entries={kbEntries}
              onRefresh={fetchKBEntries}
              onMessage={showMessage}
            />
          )}
        </div>
      )}
    </div>
  );
}
