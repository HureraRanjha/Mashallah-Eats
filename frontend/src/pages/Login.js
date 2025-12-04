// frontend/src/pages/Login.js
import React from 'react';
import { Link } from 'react-router-dom';

export default function Login() {
  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content flex-col lg:flex-row-reverse">
        <div className="text-center lg:text-left ml-10">
          <h1 className="text-5xl font-bold">Login now!</h1>
          <p className="py-6">Access your order history and VIP benefits.</p>
        </div>
        <div className="card flex-shrink-0 w-full max-w-sm shadow-2xl bg-base-100">
          <div className="card-body">
            <div className="form-control">
              <label className="label"><span className="label-text">Username</span></label>
              <input type="text" placeholder="username" className="input input-bordered" />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Password</span></label>
              <input type="password" placeholder="password" className="input input-bordered" />
            </div>
            <div className="form-control mt-6">
              <button className="btn btn-primary">Login</button>
            </div>
            <label className="label justify-center">
              <Link to="/register" className="label-text-alt link link-hover">Don't have an account? Sign up</Link>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}