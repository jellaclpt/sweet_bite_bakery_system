// src/pages/Login.js
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { User, Lock } from "lucide-react";
import AuthLayout, { AuthField } from "../components/AuthLayout";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ login: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const loggedInUser = await login(form.login, form.password);

      console.log("✅ Login successful. User:", loggedInUser);
      toast.success(`Welcome back, ${loggedInUser.name}!`);

      // Role-based redirect
      if (loggedInUser.role === "admin") {
        console.log("🔐 Redirecting to admin dashboard...");
        navigate("/admin/dashboard", { replace: true });
      } else if (loggedInUser.role === "customer") {
        console.log("🛍️ Redirecting to customer home (products)...");
        navigate("/", { replace: true });
      } else {
        console.warn("⚠️ Unknown role:", loggedInUser.role);
        navigate("/", { replace: true });
      }
    } catch (err) {
      console.error("Login failed:", err);

      let message = "Invalid credentials. Please try again.";

      if (err?.response?.data?.message) {
        message = err.response.data.message;
      } else if (err?.response?.data?.errors) {
        const errors = err.response.data.errors;
        if (errors && typeof errors === "object") {
          const errorMessages = Object.values(errors).flat();
          message = errorMessages.join(", ");
        }
      }

      setError(message);
      toast.error("Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to order your favorite treats."
      footer={
        <>
          Don’t have an account?{" "}
          <Link to="/register" className="font-semibold text-brand hover:underline">
            Create one
          </Link>
        </>
      }
    >
      {error && (
        <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <AuthField
          label="Username or email"
          icon={User}
          name="login"
          value={form.login}
          onChange={handleChange}
          placeholder="e.g. user_01 or you@example.com"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          autoFocus
        />
        <AuthField
          label="Password"
          icon={Lock}
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Enter your password"
          autoComplete="current-password"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand hover:bg-brand-hover text-white text-sm sm:text-base font-semibold py-2.5 sm:py-3 rounded-xl shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>

    </AuthLayout>
  );
}
