"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { OrgProvider, useOrg } from "../../contexts/OrgContext";
import { Sidebar } from "../../components/sidebar/Sidebar";
import { Alert, Avatar, Button, Popover, Skeleton } from "antd";
import { usePlatformSettings } from "../../contexts/PlatformSettingsContext";
import { LogoutOutlined, MailOutlined, UserOutlined } from "@ant-design/icons";
import NotificationBell from "../../components/notification/NotificationBell";
import HeaderSearch from "./HeaderSearch";

// Helper functions for Cookie
const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
};

const setCookie = (name: string, value: string, days = 30) => {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
};

function HeaderLeftContent() {
  const { currentOrg, userRole } = useOrg();
  const pathname = usePathname();

  const formatSegment = (seg: string) => {
    if (seg === "dashboard") return "Home";
    if (currentOrg && (seg === currentOrg.slug || seg === currentOrg.id)) {
      return currentOrg.name;
    }
    if (seg === "projects") return "Projects";
    if (seg === "my-tasks") return "Task của tôi";
    if (seg === "members") return "Thành viên";
    if (seg === "settings") return "Cài đặt";
    return seg;
  };

  return (
    <div className="flex items-center gap-3 overflow-hidden">
      {/* Breadcrumbs */}
      <div className="text-xs text-gray-400 font-medium flex items-center gap-1.5 truncate">
        {pathname
          .split("/")
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
                      ? "font-bold text-gray-700"
                      : "hover:text-gray-900 cursor-pointer text-gray-500"
                  }`}
                >
                  <span>{label}</span>
                  {isOrgSegment && userRole && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-700 border border-gray-200 uppercase">
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

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { settings } = usePlatformSettings();
  // Load initial collapsed state from cookie
  const [collapsed, setCollapsedState] = useState<boolean>(() => {
    const saved = getCookie("mainSidebarCollapsed");
    return saved === "true";
  });

  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Sync state with cookie
  const setCollapsed = (val: boolean) => {
    setCollapsedState(val);
    setCookie("mainSidebarCollapsed", val.toString());
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
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-8">
        <div className="w-full max-w-md space-y-4">
          <Skeleton active avatar paragraph={{ rows: 4 }} />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const firstLetter = user.fullName
    ? user.fullName.charAt(0).toUpperCase()
    : "U";

  const handleOpenProfile = () => {
    setAccountMenuOpen(false);
    router.push("/account/profile");
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      setAccountMenuOpen(false);
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  const accountMenu = (
    <div className="flex min-w-52 flex-col gap-1">
      <div className="border-b border-gray-100 px-3 pb-3 pt-1 text-left">
        <p className="truncate text-sm font-semibold text-gray-900">
          {user?.fullName}
        </p>
        <p className="truncate text-xs text-gray-500">@{user?.username}</p>
      </div>

      <Button
        type="text"
        icon={<UserOutlined />}
        onClick={handleOpenProfile}
        className="flex h-11 w-full items-center justify-start! rounded-xl px-3 text-gray-700 transition-colors duration-150 ease-out hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 motion-reduce:transition-none"
      >
        Thông tin cá nhân
      </Button>

      {settings.support_email ? (
        <Button
          type="link"
          icon={<MailOutlined />}
          href={`mailto:${settings.support_email}`}
          className="flex h-11 w-full items-center justify-start! rounded-xl px-3 text-blue-600 transition-colors duration-150 ease-out hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 motion-reduce:transition-none"
        >
          Liên hệ hỗ trợ
        </Button>
      ) : null}

      <Button
        type="text"
        danger
        icon={<LogoutOutlined />}
        loading={loggingOut}
        onClick={handleLogout}
        className="flex h-11 w-full items-center justify-start! rounded-xl px-3 transition-colors duration-150 ease-out hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 motion-reduce:transition-none"
      >
        Đăng xuất
      </Button>
    </div>
  );

  return (
    <OrgProvider>
      <div className="relative flex min-h-screen w-full bg-gray-50">
        {/* ─── Multi-tenant Sidebar ─────────────────── */}
        <Sidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          isMobile={isMobile}
        />

        {/* ─── Right content area ──────────────────────────────── */}
        <div className="flex-1 flex flex-col z-10 overflow-x-hidden">
          {/* ─── Top Bar / Header ───────────────────────────── */}
          <header className="h-14 flex items-center justify-between px-4 md:px-8 bg-white/90 backdrop-blur-sm border-b border-gray-100 shadow-sm sticky top-0 z-10 gap-4">
            {/* Left: Organization Name + Role Badge & Breadcrumbs */}
            <HeaderLeftContent />

            {/* Right: Search & User controls */}
            <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
              <HeaderSearch />

              {/* Notification Bell */}
              <NotificationBell />

              {/* User Avatar */}
              <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
                <Popover
                  content={accountMenu}
                  trigger="click"
                  placement="bottomRight"
                  open={accountMenuOpen}
                  onOpenChange={setAccountMenuOpen}
                  classNames={{
                    container: "rounded-xl shadow-xl",
                    content: "p-2",
                  }}
                >
                  <button
                    type="button"
                    aria-label="Mở menu tài khoản"
                    aria-expanded={accountMenuOpen}
                    className="flex h-11 w-11 items-center justify-center rounded-xl transition-colors duration-150 ease-out hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 motion-reduce:transition-none"
                  >
                    <Avatar
                      src={user?.avatarUrl}
                      icon={!user?.avatarUrl ? <UserOutlined /> : undefined}
                      className="bg-gray-200 text-gray-800 font-bold"
                      size={32}
                    >
                      {firstLetter}
                    </Avatar>
                  </button>
                </Popover>
              </div>
            </div>
          </header>
          {settings.announcement_enabled &&
          settings.announcement_message.trim() ? (
            <Alert
              type="info"
              showIcon
              banner
              message={settings.announcement_message}
              className="rounded-none border-x-0 border-gray-100"
            />
          ) : null}
          {/* ─── Main View Content ───────────────────────────── */}
          <main className="flex-1 bg-gray-50 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </OrgProvider>
  );
}
