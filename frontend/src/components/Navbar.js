import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
              <li><button onClick={handleLogout} className="btn btn-ghost btn-sm">Logout</button></li>
            </>
          ) : (
            <>
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/register">Register</Link></li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
}
