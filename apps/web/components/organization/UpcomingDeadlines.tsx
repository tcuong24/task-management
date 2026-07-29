"use client";

import React from "react";
import { Card, Tag, Avatar } from "antd";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  RightOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import Link from "next/link";

interface DeadlineTaskItem {
  id: string;
  title: string;
  displayCode: string;
  dueDate: string | null;
  priority: string;
  status: string;
  projectKey: string;
  assigneeName: string;
  assigneeAvatarUrl?: string | null;
}

interface UpcomingDeadlinesProps {
  orgSlug: string;
  upcomingDeadlines?: DeadlineTaskItem[];
}

const PRIORITY_BADGES: Record<string, { label: string; color: string }> = {
  LOW: { label: "Thấp", color: "gray" },
  MEDIUM: { label: "Trung bình", color: "blue" },
  HIGH: { label: "Cao", color: "orange" },
  CRITICAL: { label: "Khẩn cấp", color: "red" },
};

export function UpcomingDeadlines({
  orgSlug,
  upcomingDeadlines = [],
}: UpcomingDeadlinesProps) {
  const getDeadlineCategory = (dateStr: string | null) => {
    if (!dateStr) return "Khác";
    const due = dayjs(dateStr);
    const now = dayjs();

    if (due.isSame(now, "day")) return "Hôm nay";
    if (due.isSame(now.add(1, "day"), "day")) return "Ngày mai";
    if (due.isBefore(now.add(7, "day"))) return "Tuần này";
    return "Sắp tới";
  };

  return (
    <Card className="rounded-2xl border border-gray-200/80 shadow-md bg-white overflow-hidden">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gray-50 text-gray-700 flex items-center justify-center border border-gray-100">
            <CalendarOutlined className="text-base" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-gray-900 m-0">
              Hạn chót sắp tới
            </h3>
            <p className="text-xs text-gray-500 m-0 font-medium">
              Các mốc hoàn thành trong 7–14 ngày tới
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
          {upcomingDeadlines.length} task
        </span>
      </div>

      {upcomingDeadlines.length === 0 ? (
        <div className="py-10 text-center flex flex-col items-center justify-center gap-2 bg-slate-50/50 rounded-xl border border-dashed border-gray-200">
          <CalendarOutlined className="text-3xl text-gray-300" />
          <span className="text-sm font-semibold text-gray-400">
            Không có hạn chót nào trong 14 ngày tới
          </span>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-gray-100">
          {upcomingDeadlines.map((t) => {
            const category = getDeadlineCategory(t.dueDate);
            const prio = PRIORITY_BADGES[t.priority] || {
              label: t.priority,
              color: "default",
            };

            const categoryBadgeColor =
              category === "Hôm nay"
                ? "bg-red-50 text-red-700 border-red-200"
                : category === "Ngày mai"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-gray-50 text-gray-800 border-gray-200";

            return (
              <Link
                key={t.id}
                href={`/dashboard/${orgSlug}/projects/${t.projectKey}/tasks/${t.id}`}
              >
                <div className="py-2.5 first:pt-1 last:pb-1 flex items-center justify-between gap-3 hover:bg-slate-50/70 rounded-xl px-2 -mx-2 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${categoryBadgeColor}`}
                    >
                      {category}
                    </span>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-900 truncate group-hover:text-gray-700">
                          [{t.displayCode}] {t.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Avatar
                            size={16}
                            src={t.assigneeAvatarUrl || undefined}
                            icon={
                              !t.assigneeAvatarUrl ? (
                                <UserOutlined />
                              ) : undefined
                            }
                            className="bg-gray-200 text-gray-600 text-[9px]"
                          >
                            {t.assigneeName.charAt(0).toUpperCase()}
                          </Avatar>
                          <span className="font-medium text-gray-600">
                            {t.assigneeName}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {t.dueDate && (
                      <span className="text-xs font-semibold text-gray-600 flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-lg">
                        <ClockCircleOutlined className="text-[10px]" />
                        {dayjs(t.dueDate).format("DD/MM")}
                      </span>
                    )}
                    <RightOutlined className="text-[10px] text-gray-300 group-hover:text-gray-700" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}
