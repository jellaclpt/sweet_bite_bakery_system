import React from "react";
import { Link, useLocation } from "react-router-dom";
import { FiGrid, FiPlusSquare, FiClipboard, FiLogOut } from "react-icons/fi";
import { useAuth } from "../../../context/AuthContext";
import { useSidebar } from "../../../context/SidebarContext";
import { bubbleBurst } from "../../../components/bubbleBurst";
import logo from "../../../assets/logo.png";

const LINKS = [
  { to: "/admin/dashboard", label: "Dashboard", icon: FiGrid },
  { to: "/admin/products", label: "Add Product", icon: FiPlusSquare },
  { to: "/admin/orders", label: "Orders", icon: FiClipboard },
];

// Hover: a light-brown pill and a gentle zoom. Click: a bubbly burst.
const linkBase =
  "flex items-center gap-3 px-4 py-3 rounded-full font-medium transition duration-200 ease-out hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70";

export default function AdminSidebar() {
  const location = useLocation();
  const { logout } = useAuth();
  const { collapsed: isCollapsed, toggle } = useSidebar();

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <>
      <div
        className={`fixed top-0 left-0 h-screen bg-brand-cocoa flex flex-col z-40 transition-all duration-300 ${
          isCollapsed ? "-translate-x-full" : "translate-x-0"
        } w-64`}
      >
        <div className="h-[72px] px-5 border-b border-white/10 flex items-center gap-3">
          <img src={logo} alt="" className="w-10 h-10 rounded-full bg-white/90" />
          <div className="leading-tight">
            <p className="text-lg font-semibold text-white">Sweet Bite</p>
            <p className="text-xs text-white/60">Admin panel</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-8 min-h-0">
          <nav className="space-y-2" aria-label="Admin">
            {LINKS.map(({ to, label, icon: Icon }) => {
              const active = isActive(to);
              return (
                <Link
                  key={to}
                  to={to}
                  aria-current={active ? "page" : undefined}
                  className={`${linkBase} ${
                    active
                      ? "bg-white text-brand-cocoa shadow-sm"
                      : "text-white/85 hover:bg-brand-latte hover:text-white"
                  }`}
                  onClick={(e) => bubbleBurst(e.currentTarget)}
                >
                  <Icon className="text-lg shrink-0" /> <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="px-5 py-4 border-t border-white/10 flex-shrink-0">
          <button
            onClick={(e) => {
              bubbleBurst(e.currentTarget);
              logout();
            }}
            className="w-full flex items-center justify-center gap-2 bg-white/10 text-white px-4 py-3 rounded-full font-medium transition duration-200 ease-out hover:bg-brand-latte hover:scale-[1.04]"
          >
            <FiLogOut />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Overlay for mobile when sidebar is open */}
      {!isCollapsed && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden" onClick={toggle} />
      )}
    </>
  );
}
