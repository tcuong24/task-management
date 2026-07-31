"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Spin, App } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useAuth } from "../../../../../hooks/useAuth";
import { useOrg } from "../../../../../contexts/OrgContext";
import * as userService from "../../../../../services/user";
import type { MemberPublicProfile } from "../../../../../services/user";
import { MemberProfileHeader } from "../../../../../components/profile/MemberProfileHeader";
import { MemberStatsCard } from "../../../../../components/profile/MemberStatsCard";
import { MemberProjectsCard } from "../../../../../components/profile/MemberProjectsCard";

export default function MemberProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { message } = App.useApp();
  const { user: authUser } = useAuth();
  const { currentOrg } = useOrg();

  const orgSlug = params?.orgSlug as string;
  const userId = params?.userId as string;

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<MemberPublicProfile | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!currentOrg?.id || !userId) return;

    try {
      setLoading(true);
      const res = await userService.getMemberProfile(userId, currentOrg.id);
      if (res.success && res.profile) {
        setProfile(res.profile);
      }
    } catch (err: any) {
      console.error("Error fetching member profile:", err);
      message.error(err.message || "Không thể tải thông tin hồ sơ thành viên.");
    } finally {
      setLoading(false);
    }
  }, [currentOrg?.id, userId, message]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const isOwnProfile = authUser?.id === userId;

  if (loading) {
    return (
      <div className="min-h-[400px] bg-gray-50 flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Không tìm thấy hồ sơ thành viên
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Thành viên này không tồn tại hoặc không thuộc tổ chức hiện tại.
        </p>
        <button
          type="button"
          onClick={() => router.push(`/dashboard/${orgSlug}/members`)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer min-h-[44px]"
        >
          <ArrowLeftOutlined />
          Quay lại danh sách thành viên
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top back nav */}
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard/${orgSlug}/members`}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer min-h-[36px]"
        >
          <ArrowLeftOutlined />
          Danh sách thành viên
        </Link>
      </div>

      {/* Main Profile Header */}
      <MemberProfileHeader
        profile={profile}
        isOwnProfile={isOwnProfile}
        orgName={currentOrg?.name}
      />

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Work Stats */}
        <MemberStatsCard stats={profile.stats} />

        {/* Projects */}
        <MemberProjectsCard projects={profile.projects} orgSlug={orgSlug} />
      </div>
    </div>
  );
}
