"use client";
import { BarChart3, Calendar, Target, Clock, Users, TrendingUp, type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export function useNavItems(): NavItem[] {
  return useMemo(
    () => [
      { href: "/dashboard", icon: BarChart3, label: "Dashboard" },
      { href: "/calendar", icon: Calendar, label: "Calendar" },
      { href: "/tasks", icon: Target, label: "Tasks" },
      { href: "/focus", icon: Clock, label: "Focus Time" },
      { href: "/team", icon: Users, label: "Team" },
      { href: "/analytics", icon: TrendingUp, label: "Analytics" },
    ],
    []
  );
}

export function useActivePath() {
  const pathname = usePathname();
  return pathname;
}
