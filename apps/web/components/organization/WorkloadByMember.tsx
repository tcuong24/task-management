"use client";

import React from "react";
import { Card, Avatar } from "antd";
import {
  TeamOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import { WorkloadItem } from "../../services/organization";

interface WorkloadByMemberProps {
  workload: WorkloadItem[];
  totalTasksCount?: number;
}

export function WorkloadByMember({
  workload = [],
  totalTasksCount = 0,
}: WorkloadByMemberProps) {
  const maxCount = Math.max(...workload.map((w) => w.taskCount), 1);
  const isOpenEmpty = workload.length === 0;

  return (
    <Card className="rounded-2xl border border-gray-200/80 shadow-md bg-white overflow-hidden">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
        <div className="w-8 h-8 rounded-xl bg-gray-50 text-gray-700 flex items-center justify-center border border-gray-100">
          <TeamOutlined className="text-base" />
        </div>
        <div>
          <h3 className="font-semibold text-lg text-gray-900 m-0">
            Khối lượng công việc theo thành viên
          </h3>
          <p className="text-xs text-gray-500 m-0 font-medium">
            Phân bổ công việc đang mở trong tổ chức
          </p>
        </div>
      </div>

      {isOpenEmpty ? (
        <div className="py-8 px-4 text-center flex flex-col items-center justify-center gap-2 bg-slate-50/50 rounded-xl border border-dashed border-gray-200">
          {totalTasksCount === 0 ? (
            <>
              <InboxOutlined className="text-3xl text-gray-300" />
              <span className="text-sm font-semibold text-gray-400">
                Chưa có công việc nào được phân bổ
              </span>
            </>
          ) : (
            <>
              <CheckCircleOutlined className="text-3xl text-emerald-500" />
              <span className="text-sm font-semibold text-gray-700">
                Không có công việc nào đang mở 🎉
              </span>
              <span className="text-xs text-gray-400 font-medium">
                Toàn bộ công việc trong tổ chức đã hoàn thành!
              </span>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {workload.map((item) => {
            const isUnassigned = !item.assigneeId;
            const percentage = Math.min(
              Math.round((item.taskCount / maxCount) * 100),
              100,
            );

            return (
              <div
                key={item.assigneeId ?? "unassigned"}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50/60 transition-colors"
              >
                {isUnassigned ? (
                  <Avatar
                    icon={<ExclamationCircleOutlined />}
                    className="bg-amber-100 text-amber-600 flex-shrink-0"
                    size={38}
                  />
                ) : (
                  <Avatar
                    src={item.avatarUrl || undefined}
                    className="bg-gray-200 text-gray-800 font-semibold flex-shrink-0"
                    size={38}
                  >
                    {item.assigneeName
                      ? item.assigneeName.charAt(0).toUpperCase()
                      : "?"}
                  </Avatar>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center text-sm mb-1.5">
                    <span
                      className={`truncate font-semibold text-xs md:text-sm ${
                        isUnassigned ? "text-amber-600" : "text-gray-800"
                      }`}
                      title={item.assigneeName}
                    >
                      {item.assigneeName}
                      {isUnassigned && " ⚠️"}
                    </span>
                    <span className="text-xs font-bold text-gray-500 ml-2 flex-shrink-0">
                      {item.taskCount} task
                    </span>
                  </div>

                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-colors duration-500 ${
                        isUnassigned ? "bg-amber-400" : "bg-blue-500"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
