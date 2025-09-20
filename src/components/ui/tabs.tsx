/**
 * Modern tabbed interface components with Matrix theme styling
 */

"use client";

import { useState, createContext, useContext } from "react";
import { cn } from "@/lib/utils";

interface TabsContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextType | null>(null);

interface TabsProps {
  defaultValue: string;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ defaultValue, children, className }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn("w-full", className)}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
  surface?: 'surface' | 'surface-elevated';
}

export function TabsList({ children, className, surface = 'surface' }: TabsListProps) {
  const bg = surface === 'surface-elevated'
    ? 'bg-[var(--color-surface-elevated)]'
    : 'bg-[var(--color-surface)]';
  return (
    <div className={cn(
      "flex border-b border-[var(--color-border)]",
      bg,
      "rounded-t-lg overflow-hidden",
      className
    )}>
      {children}
    </div>
  );
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export function TabsTrigger({ value, children, className, icon }: TabsTriggerProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be used within Tabs");

  const { activeTab, setActiveTab } = context;
  const isActive = activeTab === value;

  return (
    <button
      type="button"
      onClick={() => setActiveTab(value)}
      className={cn(
        "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200",
        "border-b-2 border-transparent hover:bg-[var(--color-surface-elevated)]",
        isActive
          ? "border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-surface-elevated)]"
          : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
        className
      )}
    >
      {icon && (
        <span className={cn(
          "transition-colors",
          isActive ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]"
        )}>
          {icon}
        </span>
      )}
      {children}
    </button>
  );
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  surface?: 'surface' | 'surface-elevated';
}

export function TabsContent({ value, children, className, surface = 'surface' }: TabsContentProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsContent must be used within Tabs");

  const { activeTab } = context;
  const isActive = activeTab === value;

  if (!isActive) return null;

  const bg = surface === 'surface-elevated'
    ? 'bg-[var(--color-surface-elevated)]'
    : 'bg-[var(--color-surface)]';
  return (
    <div className={cn(
      "p-6 border border-t-0 border-[var(--color-border)] rounded-b-lg",
      bg,
      "min-h-[400px]",
      className
    )}>
      {children}
    </div>
  );
}
