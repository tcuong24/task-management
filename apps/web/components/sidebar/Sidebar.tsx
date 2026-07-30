"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import {
  DashboardOutlined,
  CheckSquareOutlined,
  TeamOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../hooks/useAuth";
import { useOrg } from "../../contexts/OrgContext";
import { OrgSwitcher } from "./OrgSwitcher";
import { SidebarNavItem } from "./SidebarNavItem";
import { RecentProjects } from "./RecentProjects";
interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  isMobile?: boolean;
}


export function Sidebar({ collapsed, setCollapsed, isMobile }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { currentOrg, userRole } = useOrg();
  const orgSlug = currentOrg?.slug || currentOrg?.id;
  const isAdminOrOwner = userRole === "ADMIN" || userRole === "OWNER";
  const dashboardUrl = orgSlug ? `/dashboard/${orgSlug}` : "/dashboard";
  const myTasksUrl = orgSlug ? `/dashboard/${orgSlug}/my-tasks` : "/dashboard";
  const teamUrl = orgSlug ? `/dashboard/${orgSlug}/team` : "/dashboard/members";
  const settingsUrl = orgSlug
    ? `/dashboard/${orgSlug}/settings`
    : "/dashboard";


  return (
    <aside
      className={`sticky top-0 h-screen bg-gray-50/80 border-r border-gray-100 flex flex-col justify-between py-5 ${
        collapsed ? "w-[72px] px-2" : "w-[260px] px-4"
      } select-none z-20 backdrop-blur-sm transition-[width,padding] duration-300 ease-out motion-reduce:transition-none relative`}
    >
      {/* Toggle Button */}
      {!isMobile && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3.5 top-7 bg-white border border-gray-200 rounded-full w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-300 shadow-sm transition-colors duration-150 ease-out focus-ring z-30"
          aria-label={
            collapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"
          }
          title={collapsed ? "Mở rộng" : "Thu gọn"}
        >
          {collapsed ? (
            <MenuUnfoldOutlined className="text-[12px]" />
          ) : (
            <MenuFoldOutlined className="text-[12px]" />
          )}
        </button>
      )}

      <div className="flex flex-col gap-5">
        {/* Branding & App Title */}
        <div
          className={`flex items-center ${collapsed ? "justify-center px-0" : "gap-2.5 px-2"}`}
        >
          {collapsed ? (
            <span
              className="font-brand text-2xl font-semibold tracking-tight text-gray-900"
              title="TaskFlow"
            >
              TF
            </span>
          ) : (
            <>
              <span className="font-brand text-2xl font-semibold tracking-tight text-gray-900">
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
            active={pathname.includes("/my-tasks")}
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
                active={pathname.includes("/members")}
                collapsed={collapsed}
              />
              <SidebarNavItem
                href={settingsUrl}
                icon={<SettingOutlined />}
                label="Settings"
                active={pathname.includes("/settings")}
                collapsed={collapsed}
              />
            </div>
          </>
        )}
      </div>

    </aside>
  );
}
