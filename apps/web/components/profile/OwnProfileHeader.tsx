"use client";

import React, { useRef, useState } from "react";
import { App, Avatar } from "antd";
import {
  CheckCircleFilled,
  EditOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/vi";
import type { UserProfileDetail } from "../../services/user";
import * as userService from "../../services/user";

dayjs.extend(relativeTime);

interface OwnProfileHeaderProps {
  user: UserProfileDetail;
  onAvatarUpdated: (avatarUrl: string) => void;
}

export function OwnProfileHeader({ user, onAvatarUpdated }: OwnProfileHeaderProps) {
  const { message } = App.useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const initial = (user.fullName || user.username || "U").charAt(0).toUpperCase();

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const response = await userService.uploadAvatar(file);
      onAvatarUpdated(response.user.avatarUrl || "");
      message.success("Đã cập nhật ảnh đại diện.");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không thể cập nhật ảnh đại diện.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm md:p-8">
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <div className="relative shrink-0">
          <Avatar
            size={96}
            src={user.avatarUrl}
            icon={!user.avatarUrl ? <UserOutlined /> : undefined}
            className="bg-gray-200 text-2xl font-semibold text-gray-700"
          >
            {!user.avatarUrl ? initial : undefined}
          </Avatar>
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            aria-label="Đổi ảnh đại diện"
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-xl border-2 border-white bg-blue-600 text-white shadow-md transition-colors duration-150 ease-out hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
          >
            <EditOutlined aria-hidden="true" />
          </button>
        </div>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <div className="flex flex-col items-center gap-2 sm:flex-row">
            <h1 className="break-words text-2xl font-semibold text-gray-900">
              {user.fullName || user.username}
            </h1>
            {user.isVerified ? (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                <CheckCircleFilled aria-hidden="true" /> Đã xác thực
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                <ExclamationCircleOutlined aria-hidden="true" /> Chưa xác thực
              </span>
            )}
          </div>
          <p className="mt-1 break-all text-sm text-gray-600">
            @{user.username}<span className="mx-2 text-gray-300" aria-hidden="true">·</span>
            {user.email || "Chưa cập nhật email"}
          </p>
          <p className="mt-2 text-xs leading-5 text-gray-500">
            Tham gia từ {dayjs(user.createdAt).format("DD/MM/YYYY")}
            <span className="mx-2 text-gray-300" aria-hidden="true">·</span>
            Đăng nhập gần nhất {user.lastLoginAt ? dayjs(user.lastLoginAt).locale("vi").fromNow() : "chưa có dữ liệu"}
          </p>
        </div>
      </div>
    </section>
  );
}
