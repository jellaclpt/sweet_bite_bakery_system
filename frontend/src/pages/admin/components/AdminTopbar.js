import React from "react";
import { FiMenu } from "react-icons/fi";
import logo from "../../../assets/logo.png";
import { useAuth } from "../../../context/AuthContext";

// The brand lives in the sidebar. The topbar only repeats it while the sidebar is hidden.
export default function AdminTopbar({ toggleSidebar, isSidebarOpen }) {
  const { user } = useAuth();
  const name = user?.name || "Admin";

  return (
    <div className="h-[72px] bg-[#FCE8E4] border-b border-line flex-shrink-0">
      <div className="h-full flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-brand-deep hover:bg-white/60 transition"
            aria-label={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
          >
            <FiMenu className="text-xl" />
          </button>
          {!isSidebarOpen && (
            <div className="flex items-center gap-2">
              <img src={logo} alt="Sweet Bite Logo" className="w-9 h-9" />
              <span className="text-lg font-semibold text-brand-deep">Sweet Bite</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right leading-tight hidden sm:block">
            <p className="text-sm font-medium text-brand-deep">{name}</p>
            <p className="text-xs text-gray-500">Administrator</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-sand text-brand font-semibold flex items-center justify-center">
            {name.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  );
}
