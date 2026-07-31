"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, Progress, Tag, Spin, Avatar } from "antd";
import {
  ProjectOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  RightOutlined,
  ThunderboltFilled,
  WarningOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useOrg } from "../../../contexts/OrgContext";
import * as orgService from "../../../services/organization";
import Link from "next/link";

import ActivityFeed from "../../../components/organization/ActivityFeed";
import { TaskStatusChart } from "../../../components/organization/TaskStatusChart";
import { AttentionAlerts } from "../../../components/organization/AttentionAlerts";
import { UpcomingDeadlines } from "../../../components/organization/UpcomingDeadlines";
import { hasPermission } from "@repo/permissions";

export default function OrgSlugDashboardPage() {
  const params = useParams();
  const orgSlug = (params?.orgSlug || params?.id) as string;
  const { currentOrg,userRole, loading: orgLoading } = useOrg();
  const orgId = currentOrg?.id;

  const [loadingData, setLoadingData] = useState(true);
  const [summaryData, setSummaryData] = useState<
    orgService.DashboardSummaryResponse["summary"] | null
  >(null);
const canViewActivities = Boolean(
  userRole && hasPermission(userRole, "view:org-activities")
);
  useEffect(() => {
    if (!orgId) return;

    const fetchSummary = async () => {
      try {
        setLoadingData(true);
        const res = await orgService.getDashboardSummary(orgId);
        if (res.success) {
          setSummaryData(res.summary);
        }
      } catch (err: any) {
        console.error("Error fetching dashboard summary:", err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchSummary();
  }, [orgId]);

  if (orgLoading || loadingData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Spin size="large" />
        <span className="text-sm font-medium text-gray-500">
          Đang tải thông tin Tổng quan...
        </span>
      </div>
    );
  }

  const metrics = summaryData?.metrics || {
    totalProjects: 0,
    dueSoonTasksCount: 0,
    overdueTasksCount: 0,
    completedThisWeekCount: 0,
    blockedOrCriticalCount: 0,
  };

  const projectsProgress = summaryData?.projectsProgress || [];

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6 mx-auto w-full text-left max-w-full">
      {/* Header section */}
 

      {/* Tier 1: 5 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1: Total Projects */}
        <Card className="rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gray-50 text-gray-700 flex items-center justify-center text-lg font-bold shrink-0 border border-gray-100">
              <ProjectOutlined />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-2xl font-bold text-gray-900 leading-tight">
                {metrics.totalProjects}
              </span>
              <span className="text-xs font-semibold text-gray-500 truncate">
                Tổng dự án
              </span>
            </div>
          </div>
        </Card>

        {/* Metric 2: Due Soon */}
        <Card className="rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg font-bold flex-shrink-0 border border-amber-100">
              <ClockCircleOutlined />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-2xl font-bold text-gray-900 leading-tight">
                {metrics.dueSoonTasksCount}
              </span>
              <span className="text-xs font-semibold text-gray-500 truncate">
                Sắp đến hạn (7d)
              </span>
            </div>
          </div>
        </Card>

        {/* Metric 3: Overdue */}
        <Card className="rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center text-lg font-bold flex-shrink-0 border border-red-100">
              <ExclamationCircleOutlined />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-2xl font-bold text-gray-900 leading-tight">
                {metrics.overdueTasksCount}
              </span>
              <span className="text-xs font-semibold text-gray-500 truncate">
                Task quá hạn
              </span>
            </div>
          </div>
        </Card>

        {/* Metric 4: Completed This Week */}
        <Card className="rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg font-bold flex-shrink-0 border border-emerald-100">
              <CheckCircleOutlined />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-2xl font-bold text-gray-900 leading-tight">
                {metrics.completedThisWeekCount}
              </span>
              <span className="text-xs font-semibold text-gray-500 truncate">
                Hoàn thành tuần này
              </span>
            </div>
          </div>
        </Card>

        {/* Metric 5: Critical / Blocked Tasks */}
        <Card className="rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center text-lg font-bold flex-shrink-0 border border-red-100">
              <ThunderboltFilled />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-2xl font-bold text-gray-900 leading-tight">
                {metrics.blockedOrCriticalCount || 0}
              </span>
              <span className="text-xs font-semibold text-gray-500 truncate">
                Mức khẩn cấp
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Tier 2: Row 1 - Chart (2/3) & Enhanced Projects Progress (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 cols): Task Status Donut Chart */}
        <div className="lg:col-span-2">
          <TaskStatusChart statusBreakdown={summaryData?.statusBreakdown} />
        </div>

        {/* Right (1 col): Enhanced Projects Progress */}
        <div className="flex flex-col gap-4">
          <Card className="rounded-2xl border border-gray-200/80 shadow-md bg-white overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gray-50 text-gray-700 flex items-center justify-center border border-gray-100">
                  <ProjectOutlined className="text-base" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 m-0">
                    Dự án trong tổ chức
                  </h3>
                  <p className="text-xs text-gray-500 m-0 font-medium">
                    Tiến độ hoàn thành dự án
                  </p>
                </div>
              </div>
              <Link
                href={`/dashboard/${orgSlug}/projects`}
                className="text-xs font-bold text-gray-700 hover:text-gray-900"
              >
                Xem tất cả ({metrics.totalProjects})
              </Link>
            </div>

            <div className="flex flex-col gap-3.5">
              {projectsProgress.map((proj) => {
                const percent = proj.progressPercentage;
                const colorInfo =
                  percent < 30
                    ? { strokeColor: "#3b82f6", textColor: "text-blue-600" }
                    : percent < 60
                      ? { strokeColor: "#f59e0b", textColor: "text-amber-500" }
                      : { strokeColor: "#22c55e", textColor: "text-green-600" };

                return (
                  <Link
                    key={proj.id}
                    href={`/dashboard/${orgSlug}/projects/${proj.key}`}
                  >
                    <div className="p-3 rounded-xl hover:bg-slate-50/80 transition-colors border border-transparent hover:border-gray-200/60 cursor-pointer">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="font-bold text-xs text-gray-800 truncate"
                            title={proj.name}
                          >
                            [{proj.key}] {proj.name}
                          </span>
                          {proj.overdueCount ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 shrink-0">
                              {proj.overdueCount} quá hạn
                            </span>
                          ) : null}
                        </div>
                        <span
                          className={`text-xs font-bold ${colorInfo.textColor} ml-2 shrink-0`}
                        >
                          {proj.progressPercentage}%
                        </span>
                      </div>

                      <Progress
                        percent={proj.progressPercentage}
                        showInfo={false}
                        strokeColor={colorInfo.strokeColor}
                        trailColor="#f3f4f6"
                        size="small"
                      />

                      <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2 font-medium">
                        <span>
                          {proj.doneTasks} / {proj.totalTasks} task xong
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Avatar
                            size={16}
                            src={proj.owner?.avatarUrl || undefined}
                            className="bg-gray-100 text-gray-700 text-[9px] font-bold"
                          >
                            {proj.owner?.fullName?.charAt(0) || "O"}
                          </Avatar>
                          <span className="text-gray-500 font-medium truncate max-w-[90px]">
                            {proj.owner?.fullName || "Chủ dự án"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}

              {projectsProgress.length === 0 && (
                <div className="py-8 text-center text-gray-400 text-sm">
                  Chưa có dự án nào trong tổ chức.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Tier 3: Row 2 - Attention Alerts (1/2) & Upcoming Deadlines (1/2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AttentionAlerts
          orgSlug={orgSlug}
          attentionItems={summaryData?.attentionItems}
        />
        <UpcomingDeadlines
          orgSlug={orgSlug}
          upcomingDeadlines={summaryData?.upcomingDeadlines}
        />
      </div>

      {/* Tier 4: Row 3 - Recent Activity Stream (Full Width) */}
      {orgId && canViewActivities && <ActivityFeed orgId={orgId} />}
    </div>
  );
}
