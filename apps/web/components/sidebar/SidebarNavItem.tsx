"use client";

import React from "react";
import Link from "next/link";
import CustomTooltip from "../common/CustomTooltip";
import { motion } from "framer-motion";

export interface SidebarNavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  collapsed: boolean;
  badge?: number | string;
}

export function SidebarNavItem({
  href,
  icon,
  label,
  active,
  collapsed,
  badge,
}: SidebarNavItemProps) {
  const content = (
    <Link
      href={href}
      className={`group relative flex min-h-11 items-center gap-3 py-2 rounded-xl font-semibold text-sm transition-colors duration-150 ease-out focus-ring motion-reduce:transform-none ${
        active
          ? "text-gray-900! font-bold"
          : "text-gray-600! hover:text-gray-900! hover:bg-gray-100/60!"
      } ${collapsed ? "justify-center px-0 mx-1" : "px-3.5 mx-0"}`}
    >
      {/* Sliding Active Pill Background */}
      {active && (
        <motion.div
          layoutId="sidebar-active-bg"
          className="absolute inset-0 rounded-xl bg-gray-100 shadow-xs border border-gray-200/50"
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 35,
          }}
        />
      )}

      {/* Icon */}
      <span
        className={`relative z-10 text-lg shrink-0 transition-colors ${
          active ? "text-gray-900!" : "text-gray-500 group-hover:text-gray-900"
        }`}
      >
        {icon}
      </span>

      {/* Label */}
      {!collapsed && (
        <span className="relative z-10 truncate flex-1 text-left">{label}</span>
      )}

      {/* Badge */}
      {!collapsed && badge !== undefined && (
        <span
          className={`relative z-10 text-[11px] font-bold px-2 py-0.5 rounded-full transition-colors ${
            active ? "bg-gray-200 text-gray-900!" : "bg-gray-100 text-gray-600"
          }`}
        >
          {badge}
        </span>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <CustomTooltip title={label} placement="right">
        {content}
      </CustomTooltip>
    );
  }

  return content;
}
