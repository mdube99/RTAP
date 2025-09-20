"use client";

import { useSession } from "next-auth/react";
import { SidebarNav } from "./sidebar-nav";
import { useSidebar } from "@features/shared/layout/sidebar-context";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const { isCollapsed } = useSidebar();

  if (!session) {
    // For unauthenticated users, just render children without sidebar
    return <>{children}</>;
  }

  return (
    <>
      <SidebarNav />
      <div className={`transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-64'}`}>
        {children}
      </div>
    </>
  );
}