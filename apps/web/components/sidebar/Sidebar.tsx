'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Avatar, Button } from 'antd';
import CustomTooltip from '../common/CustomTooltip';
import {
  DashboardOutlined,
  CheckSquareOutlined,
  TeamOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import { useOrg } from '../../contexts/OrgContext';
import { OrgSwitcher } from './OrgSwitcher';
import { SidebarNavItem } from './SidebarNavItem';
import { RecentProjects } from './RecentProjects';

import Link from 'next/link';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  isMobile?: boolean;
}

const ROLE_TAG_STYLES: Record<string, string> = {
  OWNER: '!bg-purple-50 !text-purple-700 !border-purple-200',
  ADMIN: '!bg-blue-50 !text-blue-700 !border-blue-200',
  MEMBER: '!bg-gray-50 !text-gray-700 !border-gray-200',
  GUEST: '!bg-amber-50 !text-amber-700 !border-amber-200',
};

export function Sidebar({ collapsed, setCollapsed, isMobile }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { currentOrg, userRole } = useOrg();
  const [loggingOut, setLoggingOut] = useState(false);

  const orgSlug = currentOrg?.slug || currentOrg?.id;
  const isAdminOrOwner = userRole === 'ADMIN' || userRole === 'OWNER';

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoggingOut(false);
    }
  };

  const dashboardUrl = orgSlug ? `/dashboard/${orgSlug}` : '/dashboard';
  const myTasksUrl = orgSlug ? `/dashboard/${orgSlug}/my-tasks` : '/dashboard';
  const teamUrl = orgSlug ? `/dashboard/${orgSlug}/team` : '/dashboard/members';
  const profileUrl = '/profile';
  const settingsUrl = orgSlug ? `/dashboard/${orgSlug}/team` : '/dashboard/members';

  const firstLetter = user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U';

  return (
    <aside
      className={`sticky top-0 h-screen bg-white border-r border-gray-200/80 flex flex-col justify-between py-5 ${collapsed ? 'w-[72px] px-2' : 'w-[260px] px-4'
        } select-none z-20 backdrop-blur-sm transition-all duration-300 ease-in-out relative`}
    >
      {/* Toggle Button */}
      {!isMobile && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3.5 top-7 bg-white border border-gray-200 rounded-full w-7 h-7 flex items-center justify-center text-gray-500 hover:text-indigo-600 hover:border-indigo-300 shadow-sm transition-all z-30"
          title={collapsed ? 'Mở rộng' : 'Thu gọn'}
        >
          {collapsed ? <MenuUnfoldOutlined className="text-[12px]" /> : <MenuFoldOutlined className="text-[12px]" />}
        </button>
      )}

      <div className="flex flex-col gap-5">
        {/* Branding & App Title */}
        <div className={`flex items-center ${collapsed ? 'justify-center px-0' : 'gap-2.5 px-2'}`}>
          {collapsed ? (
            <span className="font-brand text-2xl font-semibold tracking-tight text-indigo-600" title="TaskFlow">
              TF
            </span>
          ) : (
            <>
              <span className="font-brand text-2xl font-semibold tracking-tight text-indigo-500">
                TaskFlow
              </span>
              <span className="text-[10px] leading-none font-bold text-gray-400 bg-white/80 px-1.5 py-1 rounded-sm border border-gray-100">
                v1.0
              </span>
            </>
          )}
        </div>

        {/* 1. Organization Switcher */}
        <OrgSwitcher collapsed={collapsed} />

        {/* Divider */}
        <div className="h-px bg-gray-200/60 my-1" />

        {/* 2 & 3. Main Navigation */}
        <nav className="flex flex-col gap-1">
          <SidebarNavItem
            href={dashboardUrl}
            icon={<DashboardOutlined />}
            label="Dashboard"
            active={pathname === dashboardUrl}
            collapsed={collapsed}
          />
          <SidebarNavItem
            href={myTasksUrl}
            icon={<CheckSquareOutlined />}
            label="Task của tôi"
            active={pathname.includes('/my-tasks')}
            collapsed={collapsed}
          />
        </nav>

        {/* Divider */}
        <div className="h-px bg-gray-200/60 my-1" />

        {/* 4. Projects section */}
        <RecentProjects collapsed={collapsed} />

        {/* 5 & 6. Admin Section (Team & Settings) */}
        {isAdminOrOwner && (
          <>
            <div className="h-px bg-gray-200/60 my-1" />
            <div className="flex flex-col gap-1 text-left">
              {!collapsed && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-1">
                  Quản trị
                </span>
              )}
              <SidebarNavItem
                href={teamUrl}
                icon={<TeamOutlined />}
                label="Team"
                active={pathname.includes('/members')}
                collapsed={collapsed}
              />
              <SidebarNavItem
                href={settingsUrl}
                icon={<SettingOutlined />}
                label="Settings"
                active={pathname.includes('/settings')}
                collapsed={collapsed}
              />
            </div>
          </>
        )}
      </div>

      {/* 7. Footer: User Info & Logout */}
      <div className={`flex flex-col gap-3 border-t border-gray-200/80 pt-4 ${collapsed ? 'items-center px-0' : 'px-1'}`}>
        <Link
          href={profileUrl}
          className={`flex items-center gap-2.5 ${collapsed ? 'px-0 justify-center' : 'px-1'} hover:opacity-80 transition-opacity cursor-pointer`}
          title="Hồ sơ của tôi"
        >
          <Avatar
            icon={!user?.avatarUrl ? <UserOutlined /> : undefined}
            src={user?.avatarUrl}
            className="bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 flex-shrink-0"
            size={36}
          >
            {firstLetter}
          </Avatar>
          {!collapsed && (
            <div className="flex flex-col text-left leading-tight overflow-hidden flex-1">
              <span className="text-sm font-bold text-gray-800 truncate" title={user?.fullName}>
                {user?.fullName}
              </span>
              <span className="text-[11px] text-gray-400">@{user?.username}</span>
            </div>
          )}
        </Link>

        <div className={`flex items-center ${collapsed ? 'flex-col justify-center px-0 gap-1' : 'justify-between px-1'}`}>
          {!collapsed && (
            <span
              className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${ROLE_TAG_STYLES[userRole || user?.role || 'MEMBER']
                }`}
            >
              {userRole || user?.role || 'MEMBER'}
            </span>
          )}

          <CustomTooltip title="Đăng xuất" placement={collapsed ? 'right' : 'top'}>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              loading={loggingOut}
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-500 transition-colors h-8 w-8 flex items-center justify-center p-0 border-none bg-transparent"
            />
          </CustomTooltip>
        </div>
      </div>
    </aside>
  );
}
