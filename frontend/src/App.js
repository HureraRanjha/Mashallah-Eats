import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';

// Import your pages (Make sure these files exist!)
import Login from './pages/Login';
import Register from './pages/Register';
import Menu from './pages/Menu';
import Cart from './pages/Cart';

function App() {
  
  // I kept your backend test here so you can still see it in the console
  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/index/")
      .then((res) => res.text())
      .then((data) => {
        console.log("Backend says:", data);
      })
      .catch((err) => {
        console.error("Error calling backend:", err);
      });
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-base-200">
        
        {/* Navigation Bar Skeleton */}
        <nav className="navbar bg-base-100 shadow-xl mb-4">
           <div className="flex-1">
             <Link to="/" className="btn btn-ghost normal-case text-xl">Mashallah Eats</Link>
           </div>
           <div className="flex-none">
             <ul className="menu menu-horizontal px-1 gap-2">
               <li><Link to="/login">Login</Link></li>
               <li><Link to="/menu">Menu</Link></li>
               <li><Link to="/cart">Cart</Link></li>
             </ul>
           </div>
        </nav>

        {/* This determines which page to show based on the URL */}
        <Routes>
          {/* Default to Menu or a Home page */}
          <Route path="/" element={<Menu />} /> 
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/cart" element={<Cart />} />
        </Routes>

      </div>
    </Router>
  );
}

export default App;