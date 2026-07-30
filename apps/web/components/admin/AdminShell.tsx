"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, Button, Skeleton } from "antd";
import { motion, useReducedMotion } from "framer-motion";
import {
  AppstoreOutlined,
  ApartmentOutlined,
  FileSearchOutlined,
  HeartOutlined,
  LogoutOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../hooks/useAuth";

const navigation = [
  { href: "/admin", label: "Tổng quan", icon: <AppstoreOutlined /> },
  { href: "/admin/users", label: "Người dùng", icon: <TeamOutlined /> },
  { href: "/admin/organizations", label: "Tổ chức", icon: <ApartmentOutlined /> },
  { href: "/admin/audit-logs", label: "Nhật ký", icon: <FileSearchOutlined /> },
  { href: "/admin/system-health", label: "Sức khỏe hệ thống", icon: <HeartOutlined /> },
  { href: "/admin/settings", label: "Cấu hình", icon: <SettingOutlined />, manageOnly: true },
];

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && user?.platformRole !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [loading, router, user?.platformRole]);

  if (loading || user?.platformRole !== "ADMIN") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md">
          <Skeleton active avatar paragraph={{ rows: 4 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden w-64 shrink-0 border-r border-gray-100 bg-gray-50/80 p-4 shadow-sm backdrop-blur-sm md:flex md:flex-col">
        <Link
          href="/admin"
          className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-gray-900! focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-800 text-lg text-white shadow-sm">
            <SafetyCertificateOutlined aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold">TaskFlow</span>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Platform Admin
            </span>
          </span>
        </Link>

        <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Platform Admin">
          {navigation.filter((item) => !item.manageOnly || user.platformRole === "ADMIN").map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`group relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 motion-reduce:transition-none ${
                  active
                    ? "font-bold text-gray-900!"
                    : "text-gray-600! hover:bg-gray-100/60! hover:text-gray-900"
                }`}
              >
                {active ? (
                  <motion.span
                    layoutId="admin-sidebar-active-bg"
                    className="absolute inset-0 rounded-xl border border-gray-200/50 bg-gray-100 shadow-xs"
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 500, damping: 35 }
                    }
                    aria-hidden="true"
                  />
                ) : null}
                <span className="relative z-10 text-lg" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-200/60 pt-4">
          <div className="flex min-h-14 items-center gap-3 rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
            <Avatar
              src={user.avatarUrl || undefined}
              icon={!user.avatarUrl ? <UserOutlined /> : undefined}
              className="shrink-0 bg-gray-800 text-white"
            />
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-semibold text-gray-900">
                {user.fullName}
              </p>
              <p className="truncate text-xs text-gray-500">@{user.username}</p>
            </div>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              aria-label="Đăng xuất"
              onClick={() => void logout()}
              className="h-11 w-11 shrink-0 text-gray-500 transition-colors duration-150 ease-out hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 motion-reduce:transition-none"
            />
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex min-h-14 items-center justify-between border-b border-gray-100 bg-gray-50/80 px-4 shadow-sm backdrop-blur-sm md:hidden">
          <Link
            href="/admin"
            className="flex min-h-11 items-center gap-2 font-semibold text-gray-900! focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-800 text-white">
              <SafetyCertificateOutlined aria-hidden="true" />
            </span>
            TaskFlow
          </Link>
          <nav className="flex items-center gap-1" aria-label="Platform Admin mobile">
            {navigation.filter((item) => !item.manageOnly || user.platformRole === "ADMIN").map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 motion-reduce:transition-none ${
                    active
                      ? "text-gray-900!"
                      : "text-gray-600! hover:bg-gray-100/60! hover:text-gray-900!"
                  }`}
                >
                  {active ? (
                    <motion.span
                      layoutId="admin-mobile-nav-active-bg"
                      className="absolute inset-0 rounded-xl border border-gray-200/50 bg-gray-100 shadow-xs"
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 500, damping: 35 }
                      }
                      aria-hidden="true"
                    />
                  ) : null}
                  <span className="relative z-10">{item.icon}</span>
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
