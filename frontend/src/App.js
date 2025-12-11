import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

// Context
import { AuthProvider } from './context/AuthContext';

// Components
import Navbar from './components/Navbar';
import Chatbox from './components/Chatbox';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Menu from './pages/Menu';
import Cart from './pages/Cart';
import Profile from './pages/Profile';
import Deposit from './pages/Deposit';
import RateOrder from './pages/RateOrder';
import Complaint from './pages/Complaint';
import DiscussionBoard from './pages/DiscussionBoard';
import DiscussionPost from './pages/DiscussionPost';
import NewPost from './pages/NewPost';
import ManagerDashboard from './pages/ManagerDashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-base-200">
          <Navbar />

          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Menu />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/menu" element={<Menu />} />

            {/* Protected routes - any logged in user */}
            <Route path="/cart" element={
              <ProtectedRoute>
                <Cart />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/deposit" element={
              <ProtectedRoute allowedRoles={['registered', 'vip']}>
                <Deposit />
              </ProtectedRoute>
            } />
            <Route path="/rate/:orderId" element={
              <ProtectedRoute allowedRoles={['registered', 'vip']}>
                <RateOrder />
              </ProtectedRoute>
            } />
            <Route path="/complaint" element={
              <ProtectedRoute>
                <Complaint />
              </ProtectedRoute>
            } />
            <Route path="/discussion" element={
              <ProtectedRoute>
                <DiscussionBoard />
              </ProtectedRoute>
            } />
            <Route path="/discussion/new" element={
              <ProtectedRoute>
                <NewPost />
              </ProtectedRoute>
            } />
            <Route path="/discussion/:id" element={
              <ProtectedRoute>
                <DiscussionPost />
              </ProtectedRoute>
            } />

            {/* Manager only */}
            <Route path="/manager-dashboard" element={
              <ProtectedRoute allowedRoles={['manager']}>
                <ManagerDashboard />
              </ProtectedRoute>
            } />
          </Routes>

          <Chatbox />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
