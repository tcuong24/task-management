"use client";

import React from "react";

export type OrgRoleType = "OWNER" | "ADMIN" | "MEMBER" | "GUEST" | string;

interface RoleBadgeProps {
  role: OrgRoleType;
  className?: string;
}

const ROLE_CONFIG: Record<string, { label: string; bgClass: string }> = {
  OWNER: {
    label: "OWNER",
    bgClass: "bg-gray-100 text-gray-800 border-gray-200 font-bold",
  },
  ADMIN: {
    label: "ADMIN",
    bgClass: "bg-gray-100 text-gray-800 border-gray-200 font-semibold",
  },
  MEMBER: {
    label: "MEMBER",
    bgClass: "bg-gray-100 text-gray-700 border-gray-200 font-normal",
  },
  GUEST: {
    label: "GUEST",
    bgClass: "bg-gray-100 text-gray-700 border-gray-200 font-normal",
  },
};

export function RoleBadge({ role, className = "" }: RoleBadgeProps) {
  const config = ROLE_CONFIG[role?.toUpperCase()] || {
    label: role || "MEMBER",
    bgClass: "bg-gray-100 text-gray-700 border-gray-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono tracking-wider border ${config.bgClass} ${className}`}
    >
      {config.label}
    </span>
  );
}
