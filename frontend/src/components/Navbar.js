import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, getUserType } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userType = getUserType();
  const username = user?.user?.username || user?.username || '';

  return (
    <nav className="navbar bg-base-100 shadow-xl mb-4">
      <div className="flex-1">
        <Link to="/" className="btn btn-ghost normal-case text-xl">Mashallah Eats</Link>
      </div>
      <div className="flex-none">
        <ul className="menu menu-horizontal px-1 gap-2">
          <li><Link to="/menu">Menu</Link></li>

          {user ? (
            <>
              {/* Logged in links */}
              <li><Link to="/cart">Cart</Link></li>
              <li><Link to="/discussion">Discussion</Link></li>

              {/* Role-specific links */}
              {userType === 'manager' && (
                <li><Link to="/manager-dashboard">Dashboard</Link></li>
              )}
              {userType === 'chef' && (
                <li><Link to="/chef-dashboard">My Menu</Link></li>
              )}
              {userType === 'delivery' && (
                <li><Link to="/delivery-dashboard">Deliveries</Link></li>
              )}
              {(userType === 'registered' || userType === 'vip') && (
                <li><Link to="/profile">Profile</Link></li>
              )}

              {/* User dropdown */}
              <li>
                <details>
                  <summary className="cursor-pointer">
                    {username}
                    {userType === 'vip' && <span className="badge badge-warning badge-sm ml-1">VIP</span>}
                  </summary>
                  <ul className="p-2 bg-base-100 rounded-box shadow-lg z-50">
                    <li><Link to="/profile">Profile</Link></li>
                    <li><button onClick={handleLogout}>Logout</button></li>
                  </ul>
                </details>
              </li>
            </>
          ) : (
            <>
              {/* Not logged in */}
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/register">Register</Link></li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
}
