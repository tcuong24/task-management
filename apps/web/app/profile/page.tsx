"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { App, Spin, Tabs } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import type { UserProfileDetail } from "../../services/user";
import * as userService from "../../services/user";
import { OwnProfileHeader } from "../../components/profile/OwnProfileHeader";
import { PersonalInfoTab } from "../../components/profile/PersonalInfoTab";
import { SecurityTab } from "../../components/profile/SecurityTab";
import { OrganizationsTab } from "../../components/profile/OrganizationsTab";
import { EditProfileModal } from "../../components/profile/EditProfileModal";

export default function ProfilePage() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [profileUser, setProfileUser] = useState<UserProfileDetail | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const response = await userService.getMeDetail();
      setProfileUser(response.user);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Không thể tải hồ sơ cá nhân.",
      );
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Spin size="large" />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-center">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            Không thể hiển thị hồ sơ
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Vui lòng tải lại trang hoặc đăng nhập lại.
          </p>
        </div>
      </main>
    );
  }

  const tabItems = [
    {
      key: "account",
      label: "Thông tin cá nhân",
      children: (
        <div className="space-y-6 pt-2">
          <PersonalInfoTab
            user={profileUser}
            onEditClick={() => setEditModalOpen(true)}
          />
          <SecurityTab />
        </div>
      ),
    },
    {
      key: "work",
      label: "Tổ chức và dự án",
      children: (
        <div className="space-y-6 pt-2">
          <OrganizationsTab
            memberships={profileUser.memberships || []}
            onOrgCreated={fetchProfile}
          />
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">
              Dự án và task đang tham gia
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Dữ liệu dự án và task được quản lý riêng trong từng tổ chức. Chọn
              một tổ chức ở phía trên để xem đúng phạm vi và quyền truy cập.
            </p>
          </section>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-gray-50/80 backdrop-blur-sm shadow-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/dashboard"
            className="text-lg font-semibold text-gray-900! transition-colors duration-150 ease-out hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 motion-reduce:transition-none"
          >
            TaskFlow
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700! transition-colors duration-150 ease-out hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 motion-reduce:transition-none"
          >
            <ArrowLeftOutlined aria-hidden="true" />
            <span className="hidden sm:inline">Quay lại Dashboard</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 md:py-8">
        <OwnProfileHeader
          user={profileUser}
          onAvatarUpdated={(avatarUrl) =>
            setProfileUser((current) =>
              current ? { ...current, avatarUrl } : current,
            )
          }
        />
        <section className="px-1">
          <Tabs
            defaultActiveKey="account"
            items={tabItems}
            size="large"
            tabBarGutter={24}
          />
        </section>
      </main>

      <EditProfileModal
        open={editModalOpen}
        user={profileUser}
        onClose={() => setEditModalOpen(false)}
        onSuccess={(updated) =>
          setProfileUser((current) =>
            current ? { ...current, ...updated } : current,
          )
        }
      />
    </div>
  );
}
