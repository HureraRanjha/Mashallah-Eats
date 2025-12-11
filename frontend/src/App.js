import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

// Context
import { AuthProvider } from './context/AuthContext';

// Components
import AppLayout from './components/AppLayout';
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
import DeliveryDashboard from './pages/DeliveryDashboard';
import ChefDashboard from './pages/ChefDashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppLayout>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Menu />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/menu" element={<Menu />} />

            {/* Customer-only routes */}
            <Route path="/cart" element={
              <ProtectedRoute allowedRoles={['registered', 'vip']}>
                <Cart />
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

            {/* Protected routes - any logged in user */}
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
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
              <ProtectedRoute allowedRoles={['registered', 'vip']}>
                <NewPost />
              </ProtectedRoute>
            } />
            <Route path="/discussion/:id" element={
              <ProtectedRoute>
                <DiscussionPost />
              </ProtectedRoute>
            } />

            {/* Manager routes */}
            <Route path="/manager-dashboard" element={
              <ProtectedRoute allowedRoles={['manager']}>
                <ManagerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/manager/:section" element={
              <ProtectedRoute allowedRoles={['manager']}>
                <ManagerDashboard />
              </ProtectedRoute>
            } />

            {/* Chef routes */}
            <Route path="/chef-dashboard" element={
              <ProtectedRoute allowedRoles={['chef']}>
                <ChefDashboard />
              </ProtectedRoute>
            } />
            <Route path="/chef" element={
              <ProtectedRoute allowedRoles={['chef']}>
                <ChefDashboard />
              </ProtectedRoute>
            } />
            <Route path="/chef/:section" element={
              <ProtectedRoute allowedRoles={['chef']}>
                <ChefDashboard />
              </ProtectedRoute>
            } />

            {/* Delivery routes */}
            <Route path="/delivery-dashboard" element={
              <ProtectedRoute allowedRoles={['delivery']}>
                <DeliveryDashboard />
              </ProtectedRoute>
            } />
            <Route path="/delivery" element={
              <ProtectedRoute allowedRoles={['delivery']}>
                <DeliveryDashboard />
              </ProtectedRoute>
            } />
            <Route path="/delivery/:section" element={
              <ProtectedRoute allowedRoles={['delivery']}>
                <DeliveryDashboard />
              </ProtectedRoute>
            } />
          </Routes>

          <Chatbox />
        </AppLayout>
      </Router>
    </AuthProvider>
  );
}

export default App;
