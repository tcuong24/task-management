"use client";

import React from "react";
import { CheckCircleOutlined, SyncOutlined } from "@ant-design/icons";

interface MemberStatsCardProps {
  stats: {
    assignedTasksCount: number;
    completedTasksCount: number;
  };
}

export function MemberStatsCard({ stats }: MemberStatsCardProps) {
  const totalTasks = stats.assignedTasksCount + stats.completedTasksCount;
  const completionRate =
    totalTasks > 0
      ? Math.round((stats.completedTasksCount / totalTasks) * 100)
      : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
      <h2 className="text-base font-semibold text-gray-900">
        Thống kê công việc
      </h2>

      <div className="grid grid-cols-2 gap-4">
        {/* Active tasks */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-lg flex-shrink-0">
            <SyncOutlined />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.assignedTasksCount}
            </p>
            <p className="text-xs text-gray-500 font-medium">Task đang mở</p>
          </div>
        </div>

        {/* Completed tasks */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg flex-shrink-0">
            <CheckCircleOutlined />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.completedTasksCount}
            </p>
            <p className="text-xs text-gray-500 font-medium">Đã hoàn thành</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {totalTasks > 0 && (
        <div className="pt-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5 font-medium">
            <span>Tỷ lệ hoàn thành</span>
            <span>{completionRate}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full bg-blue-600 transition-[width] duration-300 ease-out motion-reduce:transition-none"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
