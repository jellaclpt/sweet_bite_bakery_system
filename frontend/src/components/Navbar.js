import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import GooeyNav from "./GooeyNav";
import {
  Home,
  Store,
  ShoppingCart,
  ClipboardList,
  LogOut,
} from "lucide-react";
import api from "../api/api";
import { getImageUrl } from "../utils/imageUrl";
import logo from "../assets/logo.png";

export default function Navbar() {
  const { items } = useCart();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 🧮 Total cart items
  const cartCount = useMemo(
    () => items.reduce((sum, it) => sum + (it.quantity || 0), 0),
    [items]
  );

  // 🧾 Total orders count
  const [orderCount, setOrderCount] = useState(0);

  // Fetch orders count
  useEffect(() => {
    if (!user?.id) return;
    api
      .get(`/orders/user/${user.id}`)
      .then((res) => {
        const orders = res.data.data || res.data;
        setOrderCount(orders.length);
      })
      .catch((err) => console.error("Error fetching orders:", err));
  }, [user]);

  // 🚪 Logout handler
  const handleLogout = async () => {
    try {
      await logout();
    } catch {}
    navigate("/login");
  };

  if (!user) return null;

  // 🧭 Navigation links (centered Gooey)
  const navItems = [
    { label: "Home", href: "/", icon: <Home size={20} /> },
    { label: "Products", href: "/products", icon: <Store size={20} /> },
    {
      label: `Checkout (${cartCount})`,
      href: "/checkout",
      icon: <ShoppingCart size={20} />,
    },
    {
      label: `Orders (${orderCount})`,
      href: "/orders",
      icon: <ClipboardList size={20} />,
    },
  ];

  return (
    <>
      {/* 💻 Desktop Navbar */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-md shadow-md hidden md:flex items-center justify-between px-6 lg:px-10 py-3 rounded-b-3xl">
        {/* Left: Brand */}
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate("/")}
        >
          <img src={logo} alt="Sweet Bite Logo" className="w-10 h-10" />
          <span className="text-xl font-bold text-brand">Sweet Bite</span>
        </div>

        {/* Center: Gooey Navigation */}
        <div className="flex-1 flex justify-center">
          <div style={{ width: "fit-content" }}>
            <GooeyNav
              items={navItems}
              animationTime={500}
              particleCount={12}
              particleDistances={[60, 12]}
              particleR={80}
              timeVariance={200}
              colors={[1, 2, 3, 4]}
            />
          </div>
        </div>

        {/* Right: Profile Avatar + Logout */}
        <div className="flex items-center gap-3">
          {/* Profile Avatar */}
          <div className="relative group">
            <button
              onClick={() => navigate("/profile")}
              className="w-10 h-10 rounded-full border-2 overflow-hidden hover:scale-105 transition-transform cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{ borderColor: "#d4a574", '--tw-ring-color': '#974D07' }}
              aria-label="Profile"
            >
              {user.image_url ? (
                <img
                  src={getImageUrl(user.image_url)}
                  alt={user.name || "Profile"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full text-lg font-semibold flex items-center justify-center" style={{ backgroundColor: "#f0e6dd", color: "#974D07" }}>
                  {(user.name || "U").charAt(0).toUpperCase()}
                </div>
              )}
            </button>
            {/* Tooltip */}
            <div className="absolute right-0 top-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                Profile
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm font-medium text-white bg-brand hover:bg-brand-hover px-4 py-2 rounded-full transition"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </nav>

      {/* 📱 Mobile Bottom Navbar */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md shadow-lg flex justify-around items-center py-2 z-50" style={{ borderTop: `1px solid #e8ddd2` }}>
        {navItems.map((item, index) => (
          <button
            key={index}
            onClick={() => navigate(item.href)}
            className={`relative flex flex-col items-center text-xs ${
              location.pathname === item.href
                ? "font-semibold"
                : "text-gray-500"
            }`}
            style={location.pathname === item.href ? { color: "#974D07" } : {}}
          >
            {item.icon}
            <span className="mt-1">{item.label}</span>
          </button>
        ))}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center text-xs text-gray-600 transition"
          style={{ '--hover-color': '#974D07' }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#974D07'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#4b5563'}
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </>
  );
}
