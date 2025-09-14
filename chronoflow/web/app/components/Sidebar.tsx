"use client";

import Link from "next/link";
import React from "react";
import { useNavItems } from "../hooks/useNavItems";
import { usePathname } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();
  const navItems = useNavItems();
  const selectedHref = pathname;

  return (
    <aside className="fixed left-4 top-16 bottom-0 w-16 bg-gray-50 flex flex-col items-center pt-6 gap-2">
      {navItems.map(item => (
        <SidebarNavItem key={item.href} {...item} selected={item.href === selectedHref} />
      ))}
    </aside>
  );
}

function SidebarNavItem({ href, icon: Icon, label, selected }: { href: string; icon: any; label: string; selected?: boolean }) {
  return (
    <div className="relative group">
      <Link 
        href={href} 
        className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
          selected 
            ? 'bg-teal-100 text-teal-600' 
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
        }`}
      >
  <span className="text-lg"><Icon /></span>
      </Link>
      {/* Tooltip */}
      <div className="absolute left-14 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white text-sm px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        {label}
      </div>
    </div>
  );
}
