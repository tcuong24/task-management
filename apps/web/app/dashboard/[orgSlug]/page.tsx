'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, Progress, Tag, Spin, App, Avatar } from 'antd';
import {
  ProjectOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  CalendarOutlined,
  RightOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useOrg } from '../../../contexts/OrgContext';
import * as orgService from '../../../services/organization';
import Link from 'next/link';

const PRIORITY_BADGES: Record<string, string> = {
  LOW: '!bg-gray-100 !text-gray-600 border-none',
  MEDIUM: '!bg-blue-100 !text-blue-700 border-none',
  HIGH: '!bg-orange-100 !text-orange-700 border-none',
  CRITICAL: '!bg-red-100 !text-red-700 font-bold border-none',
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Thấp',
  MEDIUM: 'Trung bình',
  HIGH: 'Cao',
  CRITICAL: 'Khẩn cấp',
};

export default function OrgSlugDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = (params?.orgSlug || params?.id) as string;

  const { currentOrg, loading: orgLoading } = useOrg();
  const orgId = currentOrg?.id;

  const [loadingData, setLoadingData] = useState(true);
  const [summaryData, setSummaryData] = useState<orgService.DashboardSummaryResponse['summary'] | null>(null);

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
        console.error('Error fetching dashboard summary:', err);
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
        <span className="text-sm font-medium text-gray-500">Đang tải thông tin Tổng quan...</span>
      </div>
    );
  }

  const metrics = summaryData?.metrics || {
    totalProjects: 0,
    dueSoonTasksCount: 0,
    overdueTasksCount: 0,
    completedThisWeekCount: 0,
  };

  const upcomingTasks = summaryData?.upcomingTasks || [];
  const projectsProgress = summaryData?.projectsProgress || [];

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6 mx-auto w-full text-left max-w-full">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
            Tổng quan tổ chức
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-0.5">
            Theo dõi tiến độ dự án và các nhiệm vụ cá nhân sắp đến hạn.
          </p>
        </div>

        <Link href={`/dashboard/${orgSlug}/my-tasks`}>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold !bg-indigo-50 !text-indigo-600 hover:!bg-indigo-600 hover:!text-white transition-all shadow-sm">
            <span>Đến Task của tôi</span>
            <RightOutlined className="text-xs" />
          </button>
        </Link>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Projects */}
        <Card className="rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-bold flex-shrink-0 border border-indigo-100">
              <ProjectOutlined />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-semibold text-gray-900 leading-tight">
                {metrics.totalProjects}
              </span>
              <span className="text-xs font-semibold text-gray-500">
                Tổng số dự án
              </span>
            </div>
          </div>
        </Card>

        {/* Metric 2: Due Soon */}
        <Card className="rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl font-bold flex-shrink-0 border border-amber-100">
              <ClockCircleOutlined />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-semibold text-gray-900 leading-tight">
                {metrics.dueSoonTasksCount}
              </span>
              <span className="text-xs font-semibold text-gray-500">
                Sắp đến hạn (7 ngày)
              </span>
            </div>
          </div>
        </Card>

        {/* Metric 3: Overdue */}
        <Card className="rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center text-xl font-bold flex-shrink-0 border border-red-100">
              <ExclamationCircleOutlined />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-semibold text-gray-900 leading-tight">
                {metrics.overdueTasksCount}
              </span>
              <span className="text-xs font-semibold text-gray-500">
                Task quá hạn
              </span>
            </div>
          </div>
        </Card>

        {/* Metric 4: Completed This Week */}
        <Card className="rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold flex-shrink-0 border border-emerald-100">
              <CheckCircleOutlined />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-semibold text-gray-900 leading-tight">
                {metrics.completedThisWeekCount}
              </span>
              <span className="text-xs font-semibold text-gray-500">
                Hoàn thành tuần này
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Layout: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols width): Task sắp đến hạn */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 m-0">
              <CalendarOutlined className="text-indigo-600" />
              <span>Task sắp đến hạn của tôi</span>
            </h2>
            <Link href={`/dashboard/${orgSlug}/my-tasks`} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
              Xem tất cả ({metrics.dueSoonTasksCount})
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            {upcomingTasks.map((task) => (
              <div
                key={task.id}
                className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="flex flex-col gap-1.5 overflow-hidden">
                  <div className="flex items-center gap-2 flex-wrap">
                    {task.project && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        <ProjectOutlined className="text-[10px]" />
                        [{task.project.key}] {task.project.name}
                      </span>
                    )}

                    <Tag className={`m-0 text-[10px] px-2 py-0.5 rounded-md font-semibold ${PRIORITY_BADGES[task.priority]}`}>
                      {PRIORITY_LABELS[task.priority]}
                    </Tag>
                  </div>

                  <span className="font-bold text-gray-800 text-sm truncate">
                    {task.title}
                  </span>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  {task.dueDate && (
                    <span
                      className={`text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${dayjs(task.dueDate).isBefore(dayjs(), 'day')
                        ? 'bg-red-50 text-red-600 border border-red-100'
                        : 'bg-gray-100 text-gray-600'
                        }`}
                    >
                      <ClockCircleOutlined />
                      {dayjs(task.dueDate).format('DD/MM/YYYY')}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {upcomingTasks.length === 0 && (
              <div className="bg-white p-8 rounded-2xl border border-dashed border-gray-200 text-center">
                <p className="text-sm font-semibold text-gray-400 m-0">Không có công việc nào sắp đến hạn!</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 col width): Tiến độ dự án */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 m-0">
              <ProjectOutlined className="text-indigo-600" />
              <span>Dự án trong tổ chức</span>
            </h2>
            <Link href={`/dashboard/${orgSlug}/projects`} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
              Xem tất cả ({metrics.totalProjects})
            </Link>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col gap-4">
            {projectsProgress.map((proj) => {
              const percent = proj.progressPercentage;
              const colorInfo =
                percent < 30
                  ? { strokeColor: '#3b82f6', textColor: 'text-blue-600' }
                  : percent < 60
                    ? { strokeColor: '#f59e0b', textColor: 'text-amber-500' }
                    : { strokeColor: '#22c55e', textColor: 'text-green-600' };

              return (
                <Link key={proj.id} href={`/dashboard/${orgSlug}/projects/${proj.key}`}>
                  <div className="p-3 rounded-xl hover:bg-gray-50/80 transition-colors border border-transparent hover:border-gray-200/60 cursor-pointer">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-sm text-gray-800 truncate" title={proj.name}>
                        [{proj.key}] {proj.name}
                      </span>
                      <span className={`text-xs font-bold ${colorInfo.textColor} ml-2`}>
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

                    <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1.5 font-medium">
                      <span>{proj.doneTasks} / {proj.totalTasks} công việc hoàn thành</span>
                    </div>
                  </div>
                </Link>
              );
            })}

            {projectsProgress.length === 0 && (
              <div className="py-8 text-center text-gray-400 text-sm">
                Chưa có dự án nào.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
