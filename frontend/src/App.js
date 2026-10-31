// src/App.js
import React from "react";
import {
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminLayout from "./pages/admin/components/AdminLayout";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Products from "./pages/Products";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Register from "./pages/Register";

import { useAuth } from "./context/AuthContext";
import { SidebarProvider } from "./context/SidebarContext";

// Loading screen component
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

// PublicRoute wrapper (prevents logged-in users from seeing login/register)
function PublicRoute({ children }) {
  return children ? children : <Outlet />;
}

// Admin-only route
function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || user.role !== "admin") {
    console.warn("❌ User is not admin. Redirecting to login.");
    return <Navigate to="/login" replace />;
  }
  return children ? children : <Outlet />;
}

// Customer-only route (case-insensitive role check)
function CustomerRoute({ children }) {
  const { user, loading } = useAuth();
  const role = (user?.role || "").toLowerCase();
  if (loading) return null;
  if (!user || role !== "customer") {
    console.warn("❌ User is not customer. Redirecting to login.");
    return <Navigate to="/login" replace />;
  }
  return children ? children : <Outlet />;
}

export default function App() {
  const { loading } = useAuth();

  // Show loading screen while checking authentication
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <SidebarProvider>
      <AppContent />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 2500,
          style: { background: "#5A381E", color: "#fff", borderRadius: "10px", fontFamily: "Poppins, sans-serif" },
        }}
      />
    </SidebarProvider>
  );
}

// Main app content that lives inside the Router (so it can use useLocation)
function AppContent() {
  const { user } = useAuth();
  const location = useLocation();

  const role = (user?.role || "").toLowerCase();

  // Hide navbar on auth pages and for admin users
  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/register";
  const showCustomerNavbar = user && role === "customer" && !isAuthPage;

  console.log("Current user role in App:", user?.role, "normalized:", role, "path:", location.pathname);

  return (
    <>
      {showCustomerNavbar && <Navbar />}

      {/* Reserve room for the fixed navbar (top on desktop, bottom bar on mobile)
          so page titles are never hidden underneath it */}
      <main className={showCustomerNavbar ? "md:pt-16 pb-20 md:pb-0" : ""}>
      <Routes>
        {/* Public routes */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Admin routes */}
        <Route element={<AdminRoute />}>
          {/* One shared layout: the sidebar stays on screen while admin pages change */}
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
          </Route>
        </Route>

        {/* Customer routes */}
        <Route element={<CustomerRoute />}>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Fallback: redirect all unknown routes */}
        <Route
          path="*"
          element={
            user
              ? user.role === "admin"
                ? <Navigate to="/admin/dashboard" replace />
                : <Navigate to="/" replace />
              : <Navigate to="/login" replace />
          }
        />
      </Routes>
      </main>
    </>
  );
}

