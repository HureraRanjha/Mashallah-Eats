import React, { useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../config";

export default function Register() {
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleRegister = async () => {
    setErrorMsg("");
    setSuccessMsg("");

    // Validation
    if (!username || !firstName || !lastName || !email || !password || !confirmPassword) {
      setErrorMsg("All fields are required");
      return;
    }

    // Basic email validation
    if (!email.includes("@")) {
      setErrorMsg("Please enter a valid email address");
      return;
    }

    // Username validation
    if (username.length < 3) {
      setErrorMsg("Username must be at least 3 characters");
      return;
    }

    // Password validation
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/registration/request/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          first_name: firstName,
          last_name: lastName,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMsg(data.error || "Registration request failed");
        return;
      }

      setSuccessMsg("Your registration request has been submitted! A manager will review your application and you will receive your login credentials once approved.");
      setSubmitted(true);

    } catch (error) {
      console.error(error);
      setErrorMsg("Server error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content flex-col lg:flex-row-reverse">
        <div className="text-center lg:text-left ml-10">
          <h1 className="text-5xl font-bold">Join Us!</h1>
          <p className="py-6">
            Apply to become a registered customer. Once approved by our manager, you'll receive your login credentials to start ordering delicious food!
          </p>
        </div>

        <div className="card flex-shrink-0 w-full max-w-sm shadow-2xl bg-base-100">
          <div className="card-body">

            {errorMsg && (
              <div className="alert alert-error py-2">
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="alert alert-success py-2">
                <span>{successMsg}</span>
              </div>
            )}

            {!submitted ? (
              <>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Username</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Choose a username"
                    className="input input-bordered w-full"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">First Name</span>
                  </label>
                  <input
                    type="text"
                    placeholder="First name"
                    className="input input-bordered w-full"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Last Name</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Last name"
                    className="input input-bordered w-full"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Email</span>
                  </label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    className="input input-bordered w-full"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Password</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Min 6 characters"
                    className="input input-bordered w-full"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Confirm Password</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Confirm your password"
                    className="input input-bordered w-full"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                  />
                </div>

                <div className="form-control mt-6">
                  <button
                    className={`btn btn-primary ${loading ? "loading" : ""}`}
                    onClick={handleRegister}
                    disabled={loading}
                  >
                    {loading ? "Submitting..." : "Submit Application"}
                  </button>
                </div>

                <label className="label justify-center">
                  <Link to="/login" className="label-text-alt link link-hover">
                    Already have an account? Login
                  </Link>
                </label>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="font-bold text-lg mb-2">Application Submitted!</h3>
                <p className="opacity-70 mb-4">
                  Your request is now pending review. The manager will provide your login credentials once approved.
                </p>
                <Link to="/login" className="btn btn-outline btn-sm">
                  Go to Login
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
