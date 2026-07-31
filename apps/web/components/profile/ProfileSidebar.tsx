"use client";

import React, { useRef } from "react";
import { EditOutlined, CheckCircleFilled, ExclamationCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/vi";
import type { UserProfileDetail } from "../../services/user";
import * as userService from "../../services/user";
import { App } from "antd";

dayjs.extend(relativeTime);

interface ProfileSidebarProps {
  user: UserProfileDetail;
  isOwnProfile: boolean;
  onEditClick: () => void;
  onAvatarUpdated: (newAvatarUrl: string) => void;
}

export function ProfileSidebar({
  user,
  isOwnProfile,
  onEditClick,
  onAvatarUpdated,
}: ProfileSidebarProps) {
  const { message } = App.useApp();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      message.loading({
        content: "Đang tải ảnh đại diện lên Cloudinary...",
        key: "avatarUpload",
      });
      const res = await userService.uploadAvatar(file);
      if (res.success && res.user) {
        onAvatarUpdated(res.user.avatarUrl || "");
        message.success({
          content: "Cập nhật ảnh đại diện thành công!",
          key: "avatarUpload",
        });
      }
    } catch (err: any) {
      message.error({
        content: err.message || "Tải ảnh đại diện thất bại.",
        key: "avatarUpload",
      });
    } finally {
      if (e.target) e.target.value = "";
    }
  };

  const firstLetter = (user.fullName || user.username || "U")
    .charAt(0)
    .toUpperCase();

  const joinedFormatted = user.createdAt
    ? dayjs(user.createdAt).format("DD/MM/YYYY")
    : "Không xác định";

  const lastLoginFormatted = user.lastLoginAt
    ? dayjs(user.lastLoginAt).fromNow()
    : "Chưa đăng nhập";

  return (
    <aside className="w-full lg:col-span-4 lg:sticky lg:top-24">
      {/* Hidden file input for avatar upload */}
      <input
        type="file"
        ref={avatarInputRef}
        onChange={handleAvatarFileChange}
        accept="image/*"
        className="hidden"
      />

      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
        {/* Profile Header */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative group shrink-0">
            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-gray-50 ring-1 ring-gray-200 flex items-center justify-center bg-blue-600 text-white text-3xl font-bold">
              {user.avatarUrl ? (
                <img
                  className="w-full h-full object-cover"
                  alt={user.fullName || user.username}
                  src={user.avatarUrl}
                />
              ) : (
                firstLetter
              )}
            </div>
            {isOwnProfile && (
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-full shadow-md transition-colors duration-150 ease-out border-2 border-white flex items-center justify-center cursor-pointer min-h-[44px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 motion-reduce:transition-none"
                title="Đổi ảnh đại diện"
                aria-label="Tải ảnh đại diện mới"
              >
                <EditOutlined className="text-base" />
              </button>
            )}
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight m-0">
              {user.fullName || user.username}
            </h1>
            <p className="text-sm font-medium text-gray-500 m-0">
              @{user.username}
            </p>
          </div>

          {/* Verified Account Tag */}
          <div className="flex items-center gap-2">
            {user.isVerified ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircleFilled className="text-xs text-emerald-600" />
                Đã xác thực
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <ExclamationCircleOutlined className="text-xs text-amber-600" />
                Chưa xác thực
              </span>
            )}
          </div>

          {isOwnProfile && (
            <button
              type="button"
              onClick={onEditClick}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-medium text-sm rounded-xl transition-colors duration-150 ease-out min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 motion-reduce:transition-none"
            >
              <EditOutlined />
              Chỉnh sửa thông tin
            </button>
          )}
        </div>

        <div className="h-[1px] bg-gray-100 w-full" />

        {/* Quick Info Boxes */}
        <div className="space-y-3">
          <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-1">
              Địa chỉ Email
            </p>
            <p className="text-sm font-semibold text-gray-900 break-all m-0">
              {user.email || "Chưa cập nhật"}
            </p>
          </div>

          <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-1">
              Ngày tham gia
            </p>
            <p className="text-sm font-semibold text-gray-900 m-0">
              {joinedFormatted}
            </p>
          </div>

          <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-1">
              Đăng nhập gần nhất
            </p>
            <p className="text-sm font-semibold text-gray-900 m-0">
              {lastLoginFormatted}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
