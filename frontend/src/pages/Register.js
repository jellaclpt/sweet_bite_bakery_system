// src/pages/Register.js
import React, { useState } from "react";
import api from "../api/api";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { User, Phone, MapPin, Mail, Lock } from "lucide-react";
import AuthLayout, { AuthField } from "../components/AuthLayout";
import GoogleSignInButton from "../components/GoogleSignInButton";

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

      toast.success("Account created. Welcome to Sweet Bite!");
      navigate("/"); // go to Home
    } catch (err) {
      console.error("Registration failed:", err);

      // Handle Laravel validation errors or message
      // Show Laravel validation errors as readable sentences instead of raw JSON
      const fieldErrors = err?.response?.data?.errors;
      const backendMsg =
        (fieldErrors && typeof fieldErrors === "object" && Object.values(fieldErrors).flat().join(" ")) ||
        err?.response?.data?.message ||
        err?.message ||
        "Registration failed";

      setError(backendMsg);
      toast.error("Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const field = (name) => ({ name, value: form[name], onChange: handleChange, required: true });

  return (
    <AuthLayout
      title="Create an account"
      subtitle="Join Sweet Bite to pre-order your favorites."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-brand hover:underline">
            Log in
          </Link>
        </>
      }
    >
      {error && (
        <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AuthField label="Full Name" icon={User} placeholder="Juan Dela Cruz" autoComplete="name" {...field("name")} />
          <AuthField label="Phone Number" icon={Phone} type="tel" placeholder="09XX XXX XXXX" autoComplete="tel" {...field("phone")} />
        </div>
        <AuthField label="Address" icon={MapPin} placeholder="Street, barangay, town" autoComplete="street-address" {...field("address")} />
        <AuthField label="Email" icon={Mail} type="email" placeholder="you@example.com" autoComplete="email" {...field("email")} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AuthField label="Password" icon={Lock} type="password" placeholder="Password" autoComplete="new-password" {...field("password")} />
          <AuthField label="Confirm Password" icon={Lock} type="password" placeholder="Repeat it" autoComplete="new-password" {...field("password_confirmation")} />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand hover:bg-brand-hover text-white font-semibold py-3 rounded-xl shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed !mt-6"
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <GoogleSignInButton mode="signup" />
    </AuthLayout>
  );
}
