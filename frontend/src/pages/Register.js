// src/pages/Register.js
import React, { useState } from "react";
import api from "../api/api";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import logo from "../assets/logo.png";
import cakesBg from "../assets/cakes-bg.jpg";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    email: "",
    password: "",
    password_confirmation: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Call register endpoint
      await api.post("/register", form);

      // After registration, auto-login the user using email/password
      // (Assuming your login endpoint accepts email + password)
      await login(form.email, form.password);

      toast.success("Account created — welcome! 🎉");
      navigate("/"); // go to Home
    } catch (err) {
      console.error("Registration failed:", err);

      // Handle Laravel validation errors or message
      const backendMsg =
        err?.response?.data?.message ||
        (err?.response?.data?.errors && JSON.stringify(err.response.data.errors)) ||
        err?.message ||
        "Registration failed";

      setError(backendMsg);
      toast.error("Registration failed ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${cakesBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}>
      <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md">
        <img src={logo} alt="Sweet Bite Logo" className="w-16 h-16 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-center text-brand">Create an Account</h1>
        <p className="text-sm text-gray-500 text-center mt-1 mb-6">Join Sweet Bite to pre-order your favorites.</p>

        {error && <p className="text-red-500 text-sm mb-3 text-center">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600">Full Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full border rounded-lg px-3 py-2 mt-1 focus:ring-2 outline-none"
              style={{ '--tw-ring-color': '#974D07' }}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600">Phone Number</label>
            <input
              type="text"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              required
              className="w-full border rounded-lg px-3 py-2 mt-1 focus:ring-2 outline-none"
              style={{ '--tw-ring-color': '#974D07' }}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600">Address</label>
            <input
              type="text"
              name="address"
              value={form.address}
              onChange={handleChange}
              required
              className="w-full border rounded-lg px-3 py-2 mt-1 focus:ring-2 outline-none"
              style={{ '--tw-ring-color': '#974D07' }}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full border rounded-lg px-3 py-2 mt-1 focus:ring-2 outline-none"
              style={{ '--tw-ring-color': '#974D07' }}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full border rounded-lg px-3 py-2 mt-1 focus:ring-2 outline-none"
              style={{ '--tw-ring-color': '#974D07' }}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600">Confirm Password</label>
            <input
              type="password"
              name="password_confirmation"
              value={form.password_confirmation}
              onChange={handleChange}
              required
              className="w-full border rounded-lg px-3 py-2 mt-1 focus:ring-2 outline-none"
              style={{ '--tw-ring-color': '#974D07' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white py-2 rounded-lg transition"
            style={{ backgroundColor: "#974D07" }}
            onMouseEnter={(e) => e.target.style.opacity = "0.9"}
            onMouseLeave={(e) => e.target.style.opacity = "1"}
          >
            {loading ? "Registering..." : "Create Account"}
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-4">
          Already have an account?{" "}
          <Link to="/login" className="hover:underline" style={{ color: "#974D07" }}>
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
