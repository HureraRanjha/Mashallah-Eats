import React, { useState } from "react";
import { API_BASE_URL } from "../../config";

export default function EmployeesTab({ employees, onRefresh, onMessage }) {
  const [actionLoading, setActionLoading] = useState(false);
  const [subTab, setSubTab] = useState("chefs");
  const [showHireModal, setShowHireModal] = useState(false);
  const [hireForm, setHireForm] = useState({
    username: "",
    email: "",
    password: "",
    employee_type: "chef",
    salary: "",
  });

  // Modal states
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [showFireModal, setShowFireModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [salaryAction, setSalaryAction] = useState("raise");
  const [salaryAmount, setSalaryAmount] = useState("");
  const [isPercentage, setIsPercentage] = useState(false);
  const [bonusAmount, setBonusAmount] = useState("");
  const [bonusReason, setBonusReason] = useState("");

  const handleHireEmployee = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/hr/hire/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: hireForm.username,
          email: hireForm.email,
          password: hireForm.password,
          employee_type: hireForm.employee_type,
          salary: parseFloat(hireForm.salary),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        onMessage("success", `${hireForm.employee_type} hired successfully!`);
        setHireForm({ username: "", email: "", password: "", employee_type: "chef", salary: "" });
        setShowHireModal(false);
        onRefresh();
      } else {
        onMessage("error", data.error || "Failed to hire employee");
      }
    } catch (error) {
      onMessage("error", "Server error");
    } finally {
      setActionLoading(false);
    }
  };

  // Open modals with employee context
  const openSalaryModal = (employee, employeeType, action) => {
    setSelectedEmployee({ ...employee, type: employeeType });
    setSalaryAction(action);
    setSalaryAmount("");
    setIsPercentage(false);
    setShowSalaryModal(true);
  };

  const openBonusModal = (employee, employeeType) => {
    setSelectedEmployee({ ...employee, type: employeeType });
    setBonusAmount("");
    setBonusReason("");
    setShowBonusModal(true);
  };

  const openFireModal = (employee, employeeType) => {
    setSelectedEmployee({ ...employee, type: employeeType });
    setShowFireModal(true);
  };

  const handleFireEmployee = async () => {
    if (!selectedEmployee) return;
    setActionLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/hr/fire/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          employee_id: selectedEmployee.id,
          employee_type: selectedEmployee.type,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        onMessage("success", "Employee fired");
        setShowFireModal(false);
        setSelectedEmployee(null);
        onRefresh();
      } else {
        onMessage("error", data.error || "Failed to fire employee");
      }
    } catch (error) {
      onMessage("error", "Server error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSalaryChange = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    const numericAmount = parseFloat(salaryAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      onMessage("error", "Please enter a valid amount");
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/hr/salary/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          employee_id: selectedEmployee.id,
          employee_type: selectedEmployee.type,
          action: salaryAction,
          amount: numericAmount,
          is_percentage: isPercentage,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        onMessage("success", `Salary updated: $${parseFloat(data.old_salary).toFixed(2)} → $${parseFloat(data.new_salary).toFixed(2)}`);
        setShowSalaryModal(false);
        setSelectedEmployee(null);
        onRefresh();
      } else {
        onMessage("error", data.error || "Failed to update salary");
      }
    } catch (error) {
      onMessage("error", "Server error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAwardBonus = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    const numericAmount = parseFloat(bonusAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      onMessage("error", "Please enter a valid amount");
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/hr/bonus/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          employee_id: selectedEmployee.id,
          employee_type: selectedEmployee.type,
          bonus_amount: numericAmount,
          reason: bonusReason,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        onMessage("success", `Bonus awarded! New salary: $${parseFloat(data.new_salary).toFixed(2)}`);
        setShowBonusModal(false);
        setSelectedEmployee(null);
        onRefresh();
      } else {
        onMessage("error", data.error || "Failed to award bonus");
      }
    } catch (error) {
      onMessage("error", "Server error");
    } finally {
      setActionLoading(false);
    }
  };

  const renderEmployeeTable = (employeeList, employeeType) => (
    <div className="overflow-x-auto">
      <table className="table w-full">
        <thead>
          <tr className="bg-base-200">
            <th>Name</th>
            <th>Salary</th>
            <th>Rating</th>
            <th>Complaints</th>
            <th>Compliments</th>
            <th>Demotions</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {employeeList.map((emp) => (
            <tr key={emp.id} className={emp.demotion_count >= 2 ? "bg-error/10" : ""}>
              <td className="font-semibold">
                {emp.username}
                {emp.demotion_count >= 2 && (
                  <span className="badge badge-error badge-sm ml-2">Eligible for Termination</span>
                )}
              </td>
              <td>${parseFloat(emp.salary || 0).toFixed(2)}</td>
              <td>
                {emp.average_rating !== null && emp.average_rating !== undefined && parseFloat(emp.average_rating) > 0 ? (
                  <span className={`flex items-center gap-1 ${parseFloat(emp.average_rating) < 2 ? "text-error font-bold" : parseFloat(emp.average_rating) < 2.5 ? "text-warning" : ""}`}>
                    <span className="text-warning">★</span>
                    {parseFloat(emp.average_rating).toFixed(1)}
                    {parseFloat(emp.average_rating) < 2 && (
                      <span className="text-xs ml-1">(low!)</span>
                    )}
                  </span>
                ) : (
                  <span className="opacity-50">No ratings yet</span>
                )}
              </td>
              <td>
                <span className={emp.complaint_count >= 3 ? "text-error font-bold" : emp.complaint_count === 2 ? "text-warning font-semibold" : ""}>
                  {emp.complaint_count || 0}/3
                  {emp.complaint_count === 2 && <span className="text-xs ml-1">(at risk)</span>}
                </span>
              </td>
              <td>
                <span className={emp.compliment_count >= 3 ? "text-success font-bold" : ""}>
                  {emp.compliment_count || 0}
                </span>
              </td>
              <td>
                <span className={emp.demotion_count >= 2 ? "text-error font-bold" : emp.demotion_count === 1 ? "text-warning font-semibold" : ""}>
                  {emp.demotion_count || 0}/2
                  {emp.demotion_count === 1 && <span className="text-xs ml-1">(at risk)</span>}
                </span>
              </td>
              <td>
                <div className="flex gap-1 flex-wrap">
                  <button
                    className="btn btn-success btn-xs"
                    onClick={() => openSalaryModal(emp, employeeType, "raise")}
                    disabled={actionLoading}
                  >
                    Raise
                  </button>
                  <button
                    className="btn btn-warning btn-xs"
                    onClick={() => openSalaryModal(emp, employeeType, "cut")}
                    disabled={actionLoading}
                  >
                    Cut
                  </button>
                  <button
                    className="btn btn-info btn-xs"
                    onClick={() => openBonusModal(emp, employeeType)}
                    disabled={actionLoading}
                  >
                    Bonus
                  </button>
                  <button
                    className={`btn btn-error ${emp.demotion_count >= 2 ? "btn-sm animate-pulse" : "btn-xs"}`}
                    onClick={() => openFireModal(emp, employeeType)}
                    disabled={actionLoading}
                  >
                    {emp.demotion_count >= 2 ? "Fire Now" : "Fire"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {employeeList.length === 0 && (
            <tr>
              <td colSpan="7" className="text-center py-4 opacity-70">
                No {employeeType}s found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">Employee Management</h3>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setShowHireModal(true)}
        >
          + Hire New Employee
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="tabs tabs-boxed">
        <button
          className={`tab ${subTab === "chefs" ? "tab-active" : ""}`}
          onClick={() => setSubTab("chefs")}
        >
          Chefs ({employees.chefs.length})
        </button>
        <button
          className={`tab ${subTab === "delivery" ? "tab-active" : ""}`}
          onClick={() => setSubTab("delivery")}
        >
          Delivery ({employees.delivery.length})
        </button>
      </div>

      {subTab === "chefs" && renderEmployeeTable(employees.chefs, "chef")}
      {subTab === "delivery" && renderEmployeeTable(employees.delivery, "delivery")}

      {/* Hire Modal */}
      {showHireModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Hire New Employee</h3>

            <form onSubmit={handleHireEmployee} className="space-y-4 mt-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Username</span>
                </label>
                <input
                  type="text"
                  placeholder="Username"
                  className="input input-bordered"
                  value={hireForm.username}
                  onChange={(e) => setHireForm({ ...hireForm, username: e.target.value })}
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Email</span>
                </label>
                <input
                  type="email"
                  placeholder="Email"
                  className="input input-bordered"
                  value={hireForm.email}
                  onChange={(e) => setHireForm({ ...hireForm, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Password</span>
                </label>
                <input
                  type="password"
                  placeholder="Password"
                  className="input input-bordered"
                  value={hireForm.password}
                  onChange={(e) => setHireForm({ ...hireForm, password: e.target.value })}
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Employee Type</span>
                </label>
                <select
                  className="select select-bordered"
                  value={hireForm.employee_type}
                  onChange={(e) => setHireForm({ ...hireForm, employee_type: e.target.value })}
                >
                  <option value="chef">Chef</option>
                  <option value="delivery">Delivery Person</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Starting Salary ($)</span>
                </label>
                <input
                  type="number"
                  placeholder="Salary"
                  className="input input-bordered"
                  value={hireForm.salary}
                  onChange={(e) => setHireForm({ ...hireForm, salary: e.target.value })}
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="modal-action">
                <button
                  type="submit"
                  className={`btn btn-primary ${actionLoading ? "loading" : ""}`}
                  disabled={actionLoading}
                >
                  Hire
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setShowHireModal(false);
                    setHireForm({ username: "", email: "", password: "", employee_type: "chef", salary: "" });
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Salary Modal (Raise/Cut) */}
      {showSalaryModal && selectedEmployee && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">
              {salaryAction === "raise" ? "Raise Pay" : "Cut Pay"} - {selectedEmployee.username}
            </h3>
            <p className="text-sm opacity-70 mt-1">
              Current Salary: <span className="font-bold">${parseFloat(selectedEmployee.salary || 0).toFixed(2)}</span>
            </p>

            <form onSubmit={handleSalaryChange} className="space-y-4 mt-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Amount</span>
                </label>
                <input
                  type="number"
                  placeholder={isPercentage ? "e.g., 10 for 10%" : "e.g., 500"}
                  className="input input-bordered"
                  value={salaryAmount}
                  onChange={(e) => setSalaryAmount(e.target.value)}
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={isPercentage}
                    onChange={(e) => setIsPercentage(e.target.checked)}
                  />
                  <span className="label-text">Apply as percentage</span>
                </label>
              </div>

              {salaryAmount && (
                <div className={`alert ${salaryAction === "raise" ? "alert-success" : "alert-warning"}`}>
                  <span>
                    New salary will be: $
                    {isPercentage
                      ? (parseFloat(selectedEmployee.salary || 0) * (1 + (salaryAction === "raise" ? 1 : -1) * parseFloat(salaryAmount || 0) / 100)).toFixed(2)
                      : (parseFloat(selectedEmployee.salary || 0) + (salaryAction === "raise" ? 1 : -1) * parseFloat(salaryAmount || 0)).toFixed(2)
                    }
                  </span>
                </div>
              )}

              <div className="modal-action">
                <button
                  type="submit"
                  className={`btn ${salaryAction === "raise" ? "btn-success" : "btn-warning"} ${actionLoading ? "loading" : ""}`}
                  disabled={actionLoading}
                >
                  {salaryAction === "raise" ? "Apply Raise" : "Apply Cut"}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setShowSalaryModal(false);
                    setSelectedEmployee(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bonus Modal */}
      {showBonusModal && selectedEmployee && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Award Bonus - {selectedEmployee.username}</h3>
            <p className="text-sm opacity-70 mt-1">
              Current Salary: <span className="font-bold">${parseFloat(selectedEmployee.salary || 0).toFixed(2)}</span>
            </p>

            <form onSubmit={handleAwardBonus} className="space-y-4 mt-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Bonus Amount ($)</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g., 1000"
                  className="input input-bordered"
                  value={bonusAmount}
                  onChange={(e) => setBonusAmount(e.target.value)}
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Reason (optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Outstanding performance"
                  className="input input-bordered"
                  value={bonusReason}
                  onChange={(e) => setBonusReason(e.target.value)}
                />
              </div>

              {bonusAmount && (
                <div className="alert alert-info">
                  <span>
                    New salary will be: ${(parseFloat(selectedEmployee.salary || 0) + parseFloat(bonusAmount || 0)).toFixed(2)}
                  </span>
                </div>
              )}

              <div className="modal-action">
                <button
                  type="submit"
                  className={`btn btn-info ${actionLoading ? "loading" : ""}`}
                  disabled={actionLoading}
                >
                  Award Bonus
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setShowBonusModal(false);
                    setSelectedEmployee(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fire Modal */}
      {showFireModal && selectedEmployee && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg text-error">Fire Employee</h3>

            <div className="py-4">
              <div className="alert alert-error mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>This action cannot be undone!</span>
              </div>

              <p className="mb-2">Are you sure you want to fire:</p>
              <div className="bg-base-200 p-4 rounded-lg">
                <p className="font-bold text-lg">{selectedEmployee.username}</p>
                <p className="text-sm opacity-70">
                  {selectedEmployee.type === "chef" ? "Chef" : "Delivery Person"}
                </p>
                <p className="text-sm">
                  Salary: ${parseFloat(selectedEmployee.salary || 0).toFixed(2)}
                </p>
                <p className="text-sm">
                  Rating: {selectedEmployee.average_rating ? parseFloat(selectedEmployee.average_rating).toFixed(1) : "N/A"} ★
                </p>
              </div>
            </div>

            <div className="modal-action">
              <button
                className={`btn btn-error ${actionLoading ? "loading" : ""}`}
                onClick={handleFireEmployee}
                disabled={actionLoading}
              >
                Yes, Fire Employee
              </button>
              <button
                className="btn"
                onClick={() => {
                  setShowFireModal(false);
                  setSelectedEmployee(null);
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
