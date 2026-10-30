import React from "react";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";
import { useSidebar } from "../../../context/SidebarContext";

// Shared admin frame: sidebar, topbar and a scrollable content area
export default function AdminLayout({ children }) {
  const { collapsed, toggle } = useSidebar();

  return (
    <div className="flex h-screen bg-cream overflow-hidden">
      <AdminSidebar />
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          collapsed ? "ml-0" : "lg:ml-64 ml-0"
        }`}
      >
        <AdminTopbar toggleSidebar={toggle} isSidebarOpen={!collapsed} />
        <div className="flex-1 p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
