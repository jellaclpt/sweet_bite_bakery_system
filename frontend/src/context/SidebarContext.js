import React, { createContext, useContext, useState, useMemo, useCallback } from "react";

const SidebarContext = createContext();

export function SidebarProvider({ children }) {
  // Start hidden on small screens so the sidebar doesn't cover the page on first load
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 1024
  );

  const toggle = useCallback(() => setCollapsed((prev) => !prev), []);
  const value = useMemo(() => ({ collapsed, toggle, setCollapsed }), [collapsed, toggle]);

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  return useContext(SidebarContext);
}

