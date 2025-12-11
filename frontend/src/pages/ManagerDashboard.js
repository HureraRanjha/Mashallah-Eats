import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import {
  RegistrationsTab,
  ComplaintsTab,
  ComplimentsTab,
  EmployeesTab,
  DeliveriesTab,
  KBModerationTab,
  CustomersTab,
} from "../components/manager";

export default function ManagerDashboard() {
  const { section } = useParams();
  const navigate = useNavigate();

  // Default to registrations if no section specified
  const activeTab = section || "registrations";

  // Redirect old route to new route
  useEffect(() => {
    if (!section) {
      navigate("/manager/registrations", { replace: true });
    }
  }, [section, navigate]);

  // Data states
  const [registrations, setRegistrations] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [compliments, setCompliments] = useState([]);
  const [employees, setEmployees] = useState({ chefs: [], delivery: [] });
  const [pendingDeliveries, setPendingDeliveries] = useState([]);
  const [flaggedKB, setFlaggedKB] = useState([]);
  const [customers, setCustomers] = useState([]);

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
        case "registrations":
          await fetchRegistrations();
          break;
        case "complaints":
          await fetchComplaints();
          break;
        case "compliments":
          await fetchCompliments();
          break;
        case "employees":
          await fetchEmployees();
          break;
        case "deliveries":
          await fetchDeliveries();
          break;
        case "kb":
          await fetchFlaggedKB();
          break;
        case "customers":
          await fetchCustomers();
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
  const fetchRegistrations = async () => {
    const res = await fetch(`${API_BASE_URL}/registration/requests/`, {
      credentials: "include",
    });
    const data = await res.json();
    if (res.ok) setRegistrations(data.requests || []);
  };

  const fetchComplaints = async () => {
    const res = await fetch(`${API_BASE_URL}/complaints/`, {
      credentials: "include",
    });
    const data = await res.json();
    if (res.ok) setComplaints(data.complaints || data || []);
  };

  const fetchCompliments = async () => {
    const res = await fetch(`${API_BASE_URL}/compliments/`, {
      credentials: "include",
    });
    const data = await res.json();
    if (res.ok) setCompliments(data.compliments || data || []);
  };

  const fetchEmployees = async () => {
    const res = await fetch(`${API_BASE_URL}/hr/employees/`, {
      credentials: "include",
    });
    const data = await res.json();
    if (res.ok) {
      setEmployees({
        chefs: data.chefs || [],
        delivery: data.delivery_persons || [],
      });
    }
  };

  const fetchDeliveries = async () => {
    const res = await fetch(`${API_BASE_URL}/bids/`, {
      credentials: "include",
    });
    const data = await res.json();
    if (res.ok) setPendingDeliveries(data.orders || []);
  };

  const fetchFlaggedKB = async () => {
    const res = await fetch(`${API_BASE_URL}/kb/manage/`, {
      credentials: "include",
    });
    const data = await res.json();
    if (res.ok) setFlaggedKB(data.entries || []);
  };

  const fetchCustomers = async () => {
    const res = await fetch(`${API_BASE_URL}/hr/customers/`, {
      credentials: "include",
    });
    const data = await res.json();
    if (res.ok) setCustomers(data.customers || []);
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
      case "registrations": return fetchRegistrations;
      case "complaints": return fetchComplaints;
      case "compliments": return fetchCompliments;
      case "employees": return fetchEmployees;
      case "deliveries": return fetchDeliveries;
      case "kb": return fetchFlaggedKB;
      case "customers": return fetchCustomers;
      default: return () => {};
    }
  };

  // Get page title based on active tab
  const getPageTitle = () => {
    const titles = {
      registrations: "Registration Requests",
      complaints: "Complaints Management",
      compliments: "Compliments",
      employees: "Employee Management",
      deliveries: "Delivery Assignments",
      kb: "Knowledge Base Moderation",
      customers: "Customer Management",
    };
    return titles[activeTab] || "Manager Dashboard";
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
              {activeTab === "registrations" && (
                <RegistrationsTab
                  registrations={registrations}
                  onRefresh={getRefreshHandler()}
                  onMessage={handleMessage}
                />
              )}
              {activeTab === "complaints" && (
                <ComplaintsTab
                  complaints={complaints}
                  onRefresh={getRefreshHandler()}
                  onMessage={handleMessage}
                />
              )}
              {activeTab === "compliments" && (
                <ComplimentsTab
                  compliments={compliments}
                  onRefresh={getRefreshHandler()}
                  onMessage={handleMessage}
                />
              )}
              {activeTab === "employees" && (
                <EmployeesTab
                  employees={employees}
                  onRefresh={getRefreshHandler()}
                  onMessage={handleMessage}
                />
              )}
              {activeTab === "deliveries" && (
                <DeliveriesTab
                  pendingDeliveries={pendingDeliveries}
                  onRefresh={getRefreshHandler()}
                  onMessage={handleMessage}
                />
              )}
              {activeTab === "kb" && (
                <KBModerationTab
                  flaggedKB={flaggedKB}
                  onRefresh={getRefreshHandler()}
                  onMessage={handleMessage}
                />
              )}
              {activeTab === "customers" && (
                <CustomersTab
                  customers={customers}
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
