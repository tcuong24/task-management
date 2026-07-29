'use client';

import React, { useState } from 'react';
import { Card, Tag, Avatar, Badge } from 'antd';
import {
  WarningOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  UserAddOutlined,
  ThunderboltFilled,
  CheckCircleOutlined,
  RightOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import Link from 'next/link';

interface TaskAlertItem {
  id: string;
  title: string;
  displayCode: string;
  dueDate?: string | null;
  priority?: string;
  status?: string;
  projectKey: string;
  assigneeName?: string;
  assigneeAvatarUrl?: string | null;
}

interface AttentionAlertsProps {
  orgSlug: string;
  attentionItems?: {
    overdueTasks: TaskAlertItem[];
    unassignedTasks: TaskAlertItem[];
    criticalTasks: TaskAlertItem[];
  };
}

export function AttentionAlerts({ orgSlug, attentionItems }: AttentionAlertsProps) {
  const overdueTasks = attentionItems?.overdueTasks || [];
  const unassignedTasks = attentionItems?.unassignedTasks || [];
  const criticalTasks = attentionItems?.criticalTasks || [];

  const totalAlerts = overdueTasks.length + unassignedTasks.length + criticalTasks.length;
  const [activeTab, setActiveTab] = useState<'overdue' | 'unassigned' | 'critical'>(
    overdueTasks.length > 0 ? 'overdue' : unassignedTasks.length > 0 ? 'unassigned' : 'critical'
  );

  return (
    <Card className="rounded-2xl border border-gray-200/80 shadow-md bg-white overflow-hidden">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
            <WarningOutlined className="text-base" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-gray-900 m-0 flex items-center gap-2">
              <span>Việc cần chú ý</span>
              {totalAlerts > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                  {totalAlerts} cảnh báo
                </span>
              )}
            </h3>
            <p className="text-xs text-gray-500 m-0 font-medium">
              Các mốc công việc cần người quản lý xử lý ngay
            </p>
          </div>
        </div>
      </div>

      {totalAlerts === 0 ? (
        <div className="py-8 px-4 text-center flex flex-col items-center justify-center gap-2 bg-emerald-50/50 rounded-xl border border-dashed border-emerald-200/80">
          <CheckCircleOutlined className="text-3xl text-emerald-500" />
          <span className="text-sm font-semibold text-gray-800">
            Không có vấn đề cần chú ý! 🎉
          </span>
          <span className="text-xs text-gray-500 font-medium">
            Tất cả công việc trong tổ chức đều đang tiến triển tốt và đúng hạn.
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Alert Filter Tabs */}
          <div className="flex items-center gap-2 border-b border-gray-100 pb-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overdue')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeTab === 'overdue'
                  ? 'bg-red-50 text-red-700 border border-red-200 shadow-xs'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <ClockCircleOutlined />
              <span>Quá hạn ({overdueTasks.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('unassigned')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeTab === 'unassigned'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200 shadow-xs'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <UserAddOutlined />
              <span>Chưa phân công ({unassignedTasks.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('critical')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeTab === 'critical'
                  ? 'bg-purple-50 text-purple-700 border border-purple-200 shadow-xs'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <ThunderboltFilled />
              <span>Khẩn cấp ({criticalTasks.length})</span>
            </button>
          </div>

          {/* List items depending on active tab */}
          <div className="flex flex-col gap-2 min-h-[160px]">
            {activeTab === 'overdue' &&
              (overdueTasks.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400 font-medium">
                  Không có task nào quá hạn!
                </div>
              ) : (
                overdueTasks.map((t) => (
                  <Link key={t.id} href={`/dashboard/${orgSlug}/projects/${t.projectKey}/tasks/${t.id}`}>
                    <div className="p-2.5 rounded-xl bg-red-50/50 border border-red-100 hover:border-red-300 transition-all flex items-center justify-between gap-3 group cursor-pointer">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-100 text-red-700 shrink-0">
                          [{t.displayCode}]
                        </span>
                        <span className="text-xs font-semibold text-gray-800 truncate group-hover:text-red-600">
                          {t.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {t.dueDate && (
                          <span className="text-[11px] font-semibold text-red-600">
                            {dayjs(t.dueDate).format('DD/MM')}
                          </span>
                        )}
                        <RightOutlined className="text-[10px] text-gray-400 group-hover:text-red-600" />
                      </div>
                    </div>
                  </Link>
                ))
              ))}

            {activeTab === 'unassigned' &&
              (unassignedTasks.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400 font-medium">
                  Tất cả task đều đã có người phụ trách!
                </div>
              ) : (
                unassignedTasks.map((t) => (
                  <Link key={t.id} href={`/dashboard/${orgSlug}/projects/${t.projectKey}/tasks/${t.id}`}>
                    <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-100 hover:border-amber-300 transition-all flex items-center justify-between gap-3 group cursor-pointer">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 shrink-0">
                          [{t.displayCode}]
                        </span>
                        <span className="text-xs font-semibold text-gray-800 truncate group-hover:text-amber-600">
                          {t.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-md shrink-0">
                        Chưa gán ⚠️
                      </span>
                    </div>
                  </Link>
                ))
              ))}

            {activeTab === 'critical' &&
              (criticalTasks.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400 font-medium">
                  Không có task nào mức Khẩn cấp!
                </div>
              ) : (
                criticalTasks.map((t) => (
                  <Link key={t.id} href={`/dashboard/${orgSlug}/projects/${t.projectKey}/tasks/${t.id}`}>
                    <div className="p-2.5 rounded-xl bg-purple-50/50 border border-purple-100 hover:border-purple-300 transition-all flex items-center justify-between gap-3 group cursor-pointer">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-700 shrink-0">
                          [{t.displayCode}]
                        </span>
                        <span className="text-xs font-semibold text-gray-800 truncate group-hover:text-purple-600">
                          {t.title}
                        </span>
                      </div>
                      <Tag color="red" className="m-0 text-[10px] font-bold border-none shrink-0">
                        CRITICAL
                      </Tag>
                    </div>
                  </Link>
                ))
              ))}
          </div>
        </div>
      )}
    </Card>
  );
}
