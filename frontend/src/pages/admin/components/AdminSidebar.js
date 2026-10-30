import React, { useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { FiGrid, FiPlusSquare, FiLogOut } from "react-icons/fi";
import { useAuth } from "../../../context/AuthContext";
import { useSidebar } from "../../../context/SidebarContext";
import { useGooeyEffect } from "../../../components/GooeyNav";
import logo from "../../../assets/logo.png";

export default function AdminSidebar() {
  const location = useLocation();
  const { logout } = useAuth();
  const { collapsed: isCollapsed, toggle } = useSidebar();

  // Gooey effect for selected admin menu items (Dashboard, Products)
  const dashboardRef = useRef(null);
  const productsRef = useRef(null);
  const {
    containerRef,
    filterRef,
    textRef,
    moveToElement,
    triggerAtElement,
  } = useGooeyEffect();

  const handleHover = (ref, label) => {
    if (!ref.current) return;
    moveToElement(ref.current, label);
  };

  const handleClickGooey = (ref, label) => {
    if (!ref.current) return;
    triggerAtElement(ref.current, label);
  };

  const isActive = (path) =>
    location.pathname.startsWith(path)
      ? "bg-white text-brand-cocoa shadow-sm"
      : "text-white/80 hover:text-white hover:bg-white/10";

  return (
    <>
      {/* Sidebar */}
      <div
        ref={containerRef}
        className={`fixed top-0 left-0 h-screen bg-brand-cocoa flex flex-col z-40 transition-all duration-300 ${
          isCollapsed ? "-translate-x-full" : "translate-x-0"
        } w-64`}
      >
        {/* Sidebar header */}
        <div className="h-[72px] px-5 border-b border-white/10 flex items-center gap-3">
          <img src={logo} alt="" className="w-10 h-10 rounded-full bg-white/90" />
          <div className="leading-tight">
            <p className="text-lg font-semibold text-white">Sweet Bite</p>
            <p className="text-xs text-white/60">Admin panel</p>
          </div>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto px-5 py-8 min-h-0">
          <nav className="space-y-2">
            <Link
              ref={dashboardRef}
              to="/admin/dashboard"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition ${isActive(
                "/admin/dashboard"
              )}`}
              onMouseEnter={() => handleHover(dashboardRef, "Dashboard")}
              onClick={() => handleClickGooey(dashboardRef, "Dashboard")}
            >
              <FiGrid className="text-lg" /> <span>Dashboard</span>
            </Link>

            <Link
              ref={productsRef}
              to="/admin/products"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition ${isActive(
                "/admin/products"
              )}`}
              onMouseEnter={() => handleHover(productsRef, "Products")}
              onClick={() => handleClickGooey(productsRef, "Products")}
            >
              <FiPlusSquare className="text-lg" /> <span>Add Product</span>
            </Link>
          </nav>
        </div>

        {/* LOGOUT – ALWAYS VISIBLE AT BOTTOM */}
        <div className="px-5 py-4 border-t border-white/10 flex-shrink-0">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 bg-white/10 text-white px-4 py-3 rounded-lg font-medium hover:bg-white/20 transition"
          >
            <FiLogOut />
            <span>Logout</span>
          </button>
        </div>

        {/* Gooey overlay elements (shared with GooeyNav) */}
        <span className="effect filter" ref={filterRef}></span>
        <span className="effect text" ref={textRef}></span>
      </div>

      {/* Overlay for mobile when sidebar is open */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={toggle}
        />
      )}
    </>
  );
}
