"use client";

import React from "react";
import Link from "next/link";
import { Avatar } from "antd";
import { UserOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/vi";
import type { MemberPublicProfile } from "../../services/user";

dayjs.extend(relativeTime);

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Chủ sở hữu",
  ADMIN: "Quản trị viên",
  MEMBER: "Thành viên",
  GUEST: "Khách",
};

const ROLE_STYLES: Record<string, string> = {
  OWNER: "bg-amber-50 text-amber-700 border-amber-200",
  ADMIN: "bg-blue-50 text-blue-700 border-blue-200",
  MEMBER: "bg-gray-100 text-gray-700 border-gray-200",
  GUEST: "bg-gray-50 text-gray-600 border-gray-200",
};

interface MemberProfileHeaderProps {
  profile: MemberPublicProfile;
  isOwnProfile: boolean;
  orgName?: string;
}

export function MemberProfileHeader({
  profile,
  isOwnProfile,
  orgName,
}: MemberProfileHeaderProps) {
  const { membership } = profile;
  const roleLabel = ROLE_LABELS[membership.role] || membership.role;
  const roleStyle = ROLE_STYLES[membership.role] || ROLE_STYLES.GUEST;
  const firstLetter = (profile.fullName || profile.username || "U")
    .charAt(0)
    .toUpperCase();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
      {/* Own profile banner */}
      {isOwnProfile && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
          <p className="text-sm text-blue-700">
            Đây là hồ sơ công khai của bạn trong tổ chức.
          </p>
          <Link
            href="/account/profile"
            className="text-sm font-medium text-blue-600 hover:underline whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md"
          >
            Quản lý tài khoản →
          </Link>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
        {/* Avatar */}
        <Avatar
          size={96}
          src={profile.avatarUrl}
          icon={!profile.avatarUrl ? <UserOutlined /> : undefined}
          className="flex-shrink-0 bg-gray-200 text-gray-500"
          style={{ fontSize: profile.avatarUrl ? undefined : 36 }}
        >
          {!profile.avatarUrl ? firstLetter : undefined}
        </Avatar>

        {/* Info */}
        <div className="flex-1 text-center sm:text-left min-w-0">
          <h1 className="text-xl font-semibold text-gray-900 truncate">
            {profile.fullName}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">@{profile.username}</p>

          {/* Badges */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
            {/* Role badge */}
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${roleStyle}`}
            >
              {roleLabel}
            </span>

          </div>

          {/* Join date */}
          <p className="text-xs text-gray-500 mt-3">
            Tham gia{orgName ? ` ${orgName}` : ""}{" "}
            {dayjs(membership.joinedAt).locale("vi").fromNow()}
            <span className="text-gray-300 mx-1.5">·</span>
            {dayjs(membership.joinedAt).format("DD/MM/YYYY")}
          </p>
        </div>
      </div>
    </div>
  );
}
