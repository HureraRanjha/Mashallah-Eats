import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../config";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async () => {
    setErrorMsg("");

    try {
      const response = await fetch(`${API_BASE_URL}/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMsg(data.error || "Login failed");
        return;
      }

      // Use auth context to save user
      login(data);

      // Redirect based on role
      const userType = data.user?.user_type || data.user_type;
      if (userType === "manager") {
        navigate("/manager-dashboard");
      } else if (userType === "chef") {
        navigate("/chef-dashboard");
      } else if (userType === "delivery") {
        navigate("/delivery-dashboard");
      } else {
        navigate("/menu");
      }

    } catch (error) {
      console.error(error);
      setErrorMsg("Server error. Try again.");
    }
  };

  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content flex-col lg:flex-row-reverse">
        <div className="text-center lg:text-left ml-10">
          <h1 className="text-5xl font-bold">Login now!</h1>
          <p className="py-6">Access your order history and VIP benefits.</p>
        </div>

        <div className="card flex-shrink-0 w-full max-w-sm shadow-2xl bg-base-100">
          <div className="card-body">

            {errorMsg && (
              <div className="alert alert-error py-2">
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="form-control">
              <label className="label">
                <span className="label-text">Username</span>
              </label>
              <input
                type="text"
                placeholder="username"
                className="input input-bordered"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Password</span>
              </label>
              <input
                type="password"
                placeholder="password"
                className="input input-bordered"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <div className="form-control mt-6">
              <button className="btn btn-primary" onClick={handleLogin}>
                Login
              </button>
            </div>

            <label className="label justify-center">
              <Link to="/register" className="label-text-alt link link-hover">
                Don't have an account? Sign up
              </Link>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
