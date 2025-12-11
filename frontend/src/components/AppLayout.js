import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function AppLayout({ children }) {
  const { user, getUserType, logout } = useAuth();
  const navigate = useNavigate();
  const [warningsCount, setWarningsCount] = useState(0);
  const [balance, setBalance] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const userType = getUserType();
  const username = user?.user?.username || user?.username || '';
  const email = user?.user?.email || user?.email || '';
  const isCustomer = userType === 'registered' || userType === 'vip';
  const maxWarnings = userType === 'vip' ? 2 : 3;

  // Fetch customer data (warnings & balance)
  useEffect(() => {
    if (isCustomer) {
      fetchCustomerData();
    }
  }, [isCustomer]);

  const fetchCustomerData = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/profile/`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.customer) {
        setWarningsCount(data.customer.warnings_count || 0);
        setBalance(parseFloat(data.customer.deposit_balance || 0));
      }
    } catch (error) {
      console.error('Failed to fetch customer data:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadgeClass = () => {
    switch (userType) {
      case 'vip': return 'badge-warning';
      case 'manager': return 'badge-primary';
      case 'chef': return 'badge-secondary';
      case 'delivery': return 'badge-accent';
      default: return 'badge-ghost';
    }
  };

  // No sidebar for non-logged-in users
  if (!user) {
    return (
      <div className="min-h-screen bg-base-300">
        <Navbar />
        <main className="container mx-auto p-4">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-300 flex">
      {/* Sidebar - hidden on mobile by default */}
      <div className={`${sidebarOpen ? 'block' : 'hidden'} lg:block fixed lg:fixed z-40 top-0 left-0 h-screen`}>
        <Sidebar />
      </div>

      {/* Spacer for fixed sidebar on desktop */}
      <div className="hidden lg:block w-64 flex-shrink-0" />

      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header bar - fixed */}
        <header className="bg-base-100 shadow-lg px-4 py-3 flex items-center justify-between fixed top-0 right-0 left-0 lg:left-64 z-30">
          {/* Left side - menu toggle (mobile) and branding */}
          <div className="flex items-center gap-3">
            <button
              className="btn btn-ghost btn-square lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link to="/" className="font-bold text-xl hidden sm:block">Mashallah Eats</Link>
          </div>

          {/* Right side - user info */}
          <div className="flex items-center gap-3">
            {/* Balance display for customers */}
            {isCustomer && (
              <Link
                to="/deposit"
                className="flex items-center gap-1.5 px-2.5 py-1 bg-success/10 hover:bg-success/20 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-bold text-success text-sm">${balance.toFixed(2)}</span>
              </Link>
            )}

            {/* Warnings indicator for customers */}
            {isCustomer && warningsCount > 0 && (
              <Link
                to="/profile"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                  warningsCount >= maxWarnings - 1 ? 'bg-error/20 text-error' : 'bg-warning/20 text-warning'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="font-semibold text-sm">{warningsCount}/{maxWarnings}</span>
              </Link>
            )}

            {/* User dropdown */}
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-ghost gap-2">
                <div className="avatar placeholder">
                  <div className="bg-neutral text-neutral-content rounded-full w-8">
                    <span className="text-sm">{username.charAt(0).toUpperCase()}</span>
                  </div>
                </div>
                <div className="hidden sm:block text-left">
                  <p className="font-semibold text-sm">{username}</p>
                  <p className="text-xs opacity-70">{email}</p>
                </div>
                <span className={`badge ${getRoleBadgeClass()} badge-sm`}>
                  {userType?.toUpperCase()}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </label>
              <ul tabIndex={0} className="dropdown-content z-50 menu p-2 shadow-lg bg-base-100 rounded-box w-52 mt-2">
                <li className="menu-title">
                  <span>{username}</span>
                </li>
                <li><Link to="/profile">My Profile</Link></li>
                {isCustomer && <li><Link to="/deposit">Add Funds</Link></li>}
                <li className="border-t border-base-300 mt-2 pt-2">
                  <button onClick={handleLogout} className="text-error">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </header>

        {/* Spacer for fixed header */}
        <div className="h-16" />

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
