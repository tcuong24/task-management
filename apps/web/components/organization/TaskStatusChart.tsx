"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Card } from "antd";
import { PieChartOutlined } from "@ant-design/icons";

const Pie = dynamic(
  () => import("@ant-design/charts").then((module) => module.Pie),
  {
    ssr: false,
    loading: () => (
      <div className="h-52 w-full animate-pulse rounded-xl bg-gray-50 motion-reduce:animate-none" />
    ),
  },
);

interface TaskStatusChartProps {
  statusBreakdown?: {
    TODO: number;
    IN_PROGRESS: number;
    IN_REVIEW: number;
    DONE: number;
  };
}

const STATUS_ITEMS = [
  {
    key: "TODO",
    label: "Cần làm",
    color: "#94a3b8",
    bg: "bg-gray-50 text-gray-800 border-gray-200",
  },
  {
    key: "IN_PROGRESS",
    label: "Đang làm",
    color: "#3b82f6",
    bg: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    key: "IN_REVIEW",
    label: "Đang kiểm tra",
    color: "#f59e0b",
    bg: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    key: "DONE",
    label: "Hoàn thành",
    color: "#10b981",
    bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
];

export function TaskStatusChart({ statusBreakdown }: TaskStatusChartProps) {
  const todo = statusBreakdown?.TODO || 0;
  const inProgress = statusBreakdown?.IN_PROGRESS || 0;
  const inReview = statusBreakdown?.IN_REVIEW || 0;
  const done = statusBreakdown?.DONE || 0;
  const total = todo + inProgress + inReview + done;

  const data = [
    { type: "Cần làm", value: todo },
    { type: "Đang làm", value: inProgress },
    { type: "Đang kiểm tra", value: inReview },
    { type: "Hoàn thành", value: done },
  ];

  const config = {
    data,
    angleField: "value",
    colorField: "type",
    radius: 0.88,
    innerRadius: 0.64,
    scale: {
      color: {
        range: ["#94a3b8", "#3b82f6", "#f59e0b", "#10b981"],
      },
    },
    style: {
      fill: (datum: any) => {
        if (datum.type === "Cần làm") return "#94a3b8";
        if (datum.type === "Đang làm") return "#3b82f6";
        if (datum.type === "Đang kiểm tra") return "#f59e0b";
        if (datum.type === "Hoàn thành") return "#10b981";
        return "#94a3b8";
      },
      stroke: "#ffffff",
      lineWidth: 2,
    },
    legend: false as const,
  };

  return (
    <Card className="rounded-2xl border border-gray-200/80 shadow-md bg-white overflow-hidden">
      <div className="flex items-center gap-2 mb-2 pb-3 border-b border-gray-100">
        <div className="w-8 h-8 rounded-xl bg-gray-50 text-gray-700 flex items-center justify-center border border-gray-100">
          <PieChartOutlined className="text-base" />
        </div>
        <div>
          <h3 className="font-semibold text-lg text-gray-900 m-0">
            Trạng thái công việc
          </h3>
          <p className="text-xs text-gray-500 m-0 font-medium">
            Tỷ lệ phân bổ công việc theo giai đoạn
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-2">
        {/* Donut Chart */}
        <div className="h-[210px] w-full md:w-1/2 flex items-center justify-center relative">
          {total === 0 ? (
            <div className="text-gray-400 text-sm font-medium italic">
              Chưa có công việc nào trong tổ chức
            </div>
          ) : (
            <>
              <Pie {...config} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-extrabold text-gray-900 leading-none">
                  {total}
                </span>
                <span className="text-[10px] font-semibold text-gray-400 mt-1 uppercase tracking-wider">
                  Tổng công việc
                </span>
              </div>
            </>
          )}
        </div>

        {/* Status Breakdown Legend & Metrics */}
        <div className="w-full md:w-1/2 grid grid-cols-2 gap-2.5">
          {STATUS_ITEMS.map((item) => {
            const count =
              statusBreakdown?.[item.key as keyof typeof statusBreakdown] || 0;
            const percent = total > 0 ? Math.round((count / total) * 100) : 0;

            return (
              <div
                key={item.key}
                className="p-2.5 rounded-xl bg-slate-50/70 border border-gray-100 flex flex-col justify-between"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs font-semibold text-gray-600 truncate">
                    {item.label}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-bold text-gray-900">
                    {count}
                  </span>
                  <span className="text-[11px] font-medium text-gray-400">
                    {percent}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
