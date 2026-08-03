"use client";

import React from "react";
import { Card } from "antd";
import { PieChartOutlined } from "@ant-design/icons";

interface TaskStatusChartProps {
  statusBreakdown?: {
    TODO: number;
    IN_PROGRESS: number;
    IN_REVIEW: number;
    DONE: number;
  };
  className?: string;
}

const STATUS_ITEMS = [
  {
    key: "TODO",
    label: "Cần làm",
    color: "#94a3b8",
  },
  {
    key: "IN_PROGRESS",
    label: "Đang làm",
    color: "#3b82f6",
  },
  {
    key: "IN_REVIEW",
    label: "Đang kiểm tra",
    color: "#f59e0b",
  },
  {
    key: "DONE",
    label: "Hoàn thành",
    color: "#10b981",
  },
];

export function TaskStatusChart({
  statusBreakdown,
  className = "",
}: TaskStatusChartProps) {
  const todo = statusBreakdown?.TODO || 0;
  const inProgress = statusBreakdown?.IN_PROGRESS || 0;
  const inReview = statusBreakdown?.IN_REVIEW || 0;
  const done = statusBreakdown?.DONE || 0;
  const total = todo + inProgress + inReview + done;

  const data = [
    { key: "TODO", label: "Cần làm", value: todo, color: "#94a3b8" },
    { key: "IN_PROGRESS", label: "Đang làm", value: inProgress, color: "#3b82f6" },
    { key: "IN_REVIEW", label: "Đang kiểm tra", value: inReview, color: "#f59e0b" },
    { key: "DONE", label: "Hoàn thành", value: done, color: "#10b981" },
  ];

  // SVG Donut Math
  const R = 38;
  const C = 2 * Math.PI * R;
  let accumulated = 0;

  return (
    <Card
      className={`
        w-full h-full
        rounded-2xl
        border border-gray-200/80
        shadow-md bg-white overflow-hidden
        ${className}
      `}
    >
      <div className="flex items-center gap-2 mb-2 pb-3 border-b border-gray-100">
        <div className="w-8 h-8 rounded-xl bg-gray-50 text-gray-700 flex items-center justify-center border border-gray-100">
          <PieChartOutlined className="text-base" />
        </div>
        <div>
          <h3 className="font-semibold text-lg text-gray-900 m-0">
            Trạng thái công việc
          </h3>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-1">
        {/* SVG Donut Chart - Perfectly centered text & zero layout shift */}
        <div className="relative w-36 h-36 flex items-center justify-center shrink-0 my-1">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            {total === 0 ? (
              <circle
                cx="50"
                cy="50"
                r={R}
                fill="transparent"
                stroke="#e2e8f0"
                strokeWidth="11"
              />
            ) : (
              data.map((item) => {
                if (item.value === 0) return null;
                const strokeLength = (item.value / total) * C;
                const strokeDashoffset = -accumulated;
                accumulated += strokeLength;

                return (
                  <circle
                    key={item.key}
                    cx="50"
                    cy="50"
                    r={R}
                    fill="transparent"
                    stroke={item.color}
                    strokeWidth="11"
                    strokeDasharray={`${strokeLength} ${C - strokeLength}`}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-500 ease-out"
                  />
                );
              })
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-2xl font-black text-gray-900 leading-none">
              {total}
            </span>
            <span className="text-[9px] font-bold text-gray-400 mt-0.5 uppercase tracking-wider">
              Tổng công việc
            </span>
          </div>
        </div>

        {/* Status Breakdown Legend & Metrics */}
        <div className="w-full grid grid-cols-2 gap-2">
          {STATUS_ITEMS.map((item) => {
            const count =
              statusBreakdown?.[item.key as keyof typeof statusBreakdown] || 0;
            const percent = total > 0 ? Math.round((count / total) * 100) : 0;

            return (
              <div
                key={item.key}
                className="p-2 rounded-xl bg-slate-50/70 border border-gray-100 flex flex-col justify-between"
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs font-semibold text-gray-600 truncate">
                    {item.label}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-base font-bold text-gray-900">
                    {count}
                  </span>
                  <span className="text-[10px] font-medium text-gray-400">
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
