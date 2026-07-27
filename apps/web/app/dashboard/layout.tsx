'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { OrgProvider, useOrg } from '../../contexts/OrgContext';
import { Sidebar } from '../../components/sidebar/Sidebar';
import { Avatar, Skeleton, Input } from 'antd';
import { SearchOutlined, UserOutlined } from '@ant-design/icons';
import NotificationBell from '../../components/notification/NotificationBell';

// Helper functions for Cookie
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
};

const setCookie = (name: string, value: string, days = 30) => {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
};

function HeaderLeftContent() {
  const { currentOrg, userRole } = useOrg();
  const pathname = usePathname();

  const formatSegment = (seg: string) => {
    if (seg === 'dashboard') return 'Home';
    if (currentOrg && (seg === currentOrg.slug || seg === currentOrg.id)) {
      return currentOrg.name;
    }
    if (seg === 'projects') return 'Projects';
    if (seg === 'my-tasks') return 'Task của tôi';
    if (seg === 'members') return 'Thành viên';
    if (seg === 'settings') return 'Cài đặt';
    return seg;
  };

  return (
    <div className="flex items-center gap-3 overflow-hidden">
      {/* Breadcrumbs */}
      <div className="text-xs text-gray-400 font-medium flex items-center gap-1.5 truncate">
        {pathname
          .split('/')
          .filter(Boolean)
          .map((seg, i, arr) => {
            const label = formatSegment(seg);
            const isOrgSegment =
              currentOrg && (seg === currentOrg.slug || seg === currentOrg.id);

            return (
              <React.Fragment key={i}>
                {i > 0 && <span className="text-gray-300">/</span>}
                <span
                  className={`inline-flex items-center gap-1.5 ${
                    i === arr.length - 1
                      ? 'font-bold text-gray-700'
                      : 'hover:text-indigo-600 cursor-pointer text-gray-500'
                  }`}
                >
                  <span>{label}</span>
                  {isOrgSegment && userRole && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                      {userRole}
                    </span>
                  )}
                </span>
              </React.Fragment>
            );
          })}
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  // Load initial collapsed state from cookie
  const [collapsed, setCollapsedState] = useState<boolean>(() => {
    const saved = getCookie('mainSidebarCollapsed');
    return saved === 'true';
  });

  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Sync state with cookie
  const setCollapsed = (val: boolean) => {
    setCollapsedState(val);
    setCookie('mainSidebarCollapsed', val.toString());
  };

  // Responsive listener for mobile view
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setCollapsedState(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-8">
        <div className="w-full max-w-md space-y-4">
          <Skeleton active avatar paragraph={{ rows: 4 }} />
        </div>
      </div>
    );
  }

  const firstLetter = user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U';

  return (
    <OrgProvider>
      <div className="relative flex min-h-screen w-full bg-[#f9fafb]">
        {/* ─── Multi-tenant Sidebar ─────────────────── */}
        <Sidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          isMobile={isMobile}
        />

        {/* ─── Right content area ──────────────────────────────── */}
        <div className="flex-1 flex flex-col z-10 overflow-x-hidden">
          {/* ─── Top Bar / Header ───────────────────────────── */}
          <header className="h-14 flex items-center justify-between px-6 md:px-8 bg-white/70 backdrop-blur-md border-b border-gray-200/80 shadow-sm sticky top-0 z-10 gap-4">
            {/* Left: Organization Name + Role Badge & Breadcrumbs */}
            <HeaderLeftContent />

            {/* Right: Search & User controls */}
            <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
              <Input
                placeholder="Tìm kiếm công việc..."
                prefix={<SearchOutlined className="text-gray-400" />}
                className="w-36 sm:w-48 md:w-64 rounded-xl border-gray-200 bg-gray-50/50 hover:bg-white focus:bg-white transition-all text-xs"
              />

              {/* Notification Bell */}
              <NotificationBell />

              {/* User Avatar */}
              <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
                <Avatar
                  src={user?.avatarUrl}
                  icon={!user?.avatarUrl ? <UserOutlined /> : undefined}
                  className="bg-indigo-600 text-white font-bold cursor-pointer hover:opacity-90"
                  size={32}
                >
                  {firstLetter}
                </Avatar>
              </div>
            </div>
          </header>

          {/* ─── Main View Content ───────────────────────────── */}
          <main className="flex-1 p-2 md:p-4 bg-white">{children}</main>
        </div>
      </div>
    </OrgProvider>
  );
}
