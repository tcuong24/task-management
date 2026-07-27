'use client';

import React from 'react';

export type MemberStatusType = 'ACTIVE' | 'INVITED' | 'SUSPENDED' | string;

interface StatusBadgeProps {
  status: MemberStatusType;
  className?: string;
}

const STATUS_CONFIG: Record<string, { label: string; dotColor: string; bgClass: string }> = {
  ACTIVE: {
    label: 'Active',
    dotColor: 'bg-emerald-500',
    bgClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  INVITED: {
    label: 'Invited',
    dotColor: 'bg-amber-500',
    bgClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  SUSPENDED: {
    label: 'Suspended',
    dotColor: 'bg-gray-400',
    bgClass: 'bg-gray-100 text-gray-600 border-gray-200',
  },
};

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status?.toUpperCase()] || {
    label: status || 'Unknown',
    dotColor: 'bg-gray-400',
    bgClass: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${config.bgClass} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
      <span>{config.label}</span>
    </span>
  );
}
