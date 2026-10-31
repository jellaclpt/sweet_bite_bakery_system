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
import { bubbleBurst } from "./bubbleBurst";

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
  }, [user, location.pathname]);

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

  const mobileItems = [
    { label: "Home", href: "/", icon: Home },
    { label: "Products", href: "/products", icon: Store },
    { label: "Cart", href: "/checkout", icon: ShoppingCart, count: cartCount },
    { label: "Orders", href: "/orders", icon: ClipboardList, count: orderCount },
    { label: "Profile", href: "/profile", avatar: true },
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
            <GooeyNav items={navItems} />
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

      {/* Mobile bottom bar: short labels with count badges, and Profile (logout lives on the Profile page) */}
      <nav
        aria-label="Main"
        className="md:hidden fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-line shadow-[0_-4px_16px_rgba(90,56,30,0.08)] z-50 pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="grid grid-cols-5">
          {mobileItems.map(({ label, href, icon: Icon, count, avatar }) => {
            const active = location.pathname === href;
            return (
              <li key={href}>
                <button
                  type="button"
                  onClick={(e) => {
                    if (!active) bubbleBurst(e.currentTarget.firstChild, { count: 10 });
                    navigate(href);
                  }}
                  aria-current={active ? "page" : undefined}
                  className={`w-full flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] transition ${
                    active ? "text-brand font-semibold" : "text-gray-500"
                  }`}
                >
                  <span
                    className={`relative flex items-center justify-center w-11 h-7 rounded-full transition ${
                      active ? "bg-sand" : ""
                    }`}
                  >
                    {avatar ? (
                      user.image_url ? (
                        <img
                          src={getImageUrl(user.image_url)}
                          alt=""
                          className={`w-6 h-6 rounded-full object-cover ${active ? "ring-2 ring-brand" : ""}`}
                        />
                      ) : (
                        <span className="w-6 h-6 rounded-full bg-sand text-brand text-xs font-semibold flex items-center justify-center">
                          {(user.name || "U").charAt(0).toUpperCase()}
                        </span>
                      )
                    ) : (
                      <Icon size={20} />
                    )}
                    {count > 0 && (
                      <span className="absolute -top-1 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-white text-[10px] font-semibold flex items-center justify-center">
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </span>
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
