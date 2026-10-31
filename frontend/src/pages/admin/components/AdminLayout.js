import React, { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";
import { useSidebar } from "../../../context/SidebarContext";

// Shared admin frame. It's a route layout, so the sidebar and top bar stay mounted while
// moving between admin pages (that's what lets the sidebar's click animation finish).
export default function AdminLayout({ children }) {
  const { collapsed, toggle } = useSidebar();
  const { pathname } = useLocation();
  const contentRef = useRef(null);

  // Each admin page starts at the top
  useEffect(() => {
    contentRef.current?.scrollTo?.(0, 0);
  }, [pathname]);

  return (
    <div className="flex h-screen bg-cream overflow-hidden">
      <AdminSidebar />
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          collapsed ? "ml-0" : "lg:ml-64 ml-0"
        }`}
      >
        <AdminTopbar toggleSidebar={toggle} isSidebarOpen={!collapsed} />
        <div ref={contentRef} className="flex-1 p-6 overflow-y-auto">
          {children ?? <Outlet />}
        </div>
      </div>
    </div>
  );
}
