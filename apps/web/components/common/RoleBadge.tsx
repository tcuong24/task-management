'use client';

import React from 'react';
import { Tag } from 'antd';

export type OrgRoleType = 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST' | string;

interface RoleBadgeProps {
  role: OrgRoleType;
  className?: string;
}

const ROLE_CONFIG: Record<string, { label: string; color: string; bgClass: string }> = {
  OWNER: {
    label: 'OWNER',
    color: 'purple',
    bgClass: 'bg-purple-50 text-purple-700 border-purple-200 font-bold',
  },
  ADMIN: {
    label: 'ADMIN',
    color: 'blue',
    bgClass: 'bg-blue-50 text-blue-700 border-blue-200 font-semibold',
  },
  MEMBER: {
    label: 'MEMBER',
    color: 'default',
    bgClass: 'bg-gray-100 text-gray-700 border-gray-200 font-normal',
  },
  GUEST: {
    label: 'GUEST',
    color: 'warning',
    bgClass: 'bg-amber-50 text-amber-700 border-amber-200 font-normal',
  },
};

export function RoleBadge({ role, className = '' }: RoleBadgeProps) {
  const config = ROLE_CONFIG[role?.toUpperCase()] || {
    label: role || 'MEMBER',
    color: 'default',
    bgClass: 'bg-gray-100 text-gray-700 border-gray-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono tracking-wider border ${config.bgClass} ${className}`}
    >
      {config.label}
    </span>
  );
}
