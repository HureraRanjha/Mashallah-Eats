import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  // Refresh user data from backend
  const refreshUser = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/profile/`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        // Update local user data with fresh data from backend
        const updatedUser = {
          ...user,
          user: {
            ...user?.user,
            user_type: data.user_type,
          },
          user_type: data.user_type,
          customer: data.customer,
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
        return updatedUser;
      }
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
    return null;
  };

  // Helper to get user type
  const getUserType = () => {
    return user?.user?.user_type || user?.user_type || null;
  };

  const isAuthenticated = () => !!user;

  const value = {
    user,
    loading,
    login,
    logout,
    refreshUser,
    getUserType,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
