"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Alert, Badge, Card, Empty, Skeleton, Statistic, Table } from "antd";
import type { TableColumnsType } from "antd";
import {
  AdminSystemHealth,
  getAdminSystemHealth,
} from "../../../services/admin";

type Attachment = NonNullable<AdminSystemHealth["largeAttachments"]>[number];

const Line = dynamic(
  () => import("@ant-design/charts").then((module) => module.Line),
  {
    ssr: false,
    loading: () => (
      <div className="h-75 animate-pulse rounded-xl bg-gray-50 motion-reduce:animate-none" />
    ),
  },
);

function formatMb(value: string | number) {
  return `${(Number(value) / 1024 / 1024).toFixed(2)} MB`;
}

export default function AdminSystemHealthPage() {
  const [health, setHealth] = useState<AdminSystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    void getAdminSystemHealth()
      .then((response) => setHealth(response.health))
      .catch((err) => {
        console.error("Failed to load system health:", err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const chartData = useMemo(
    () =>
      (health?.activity || []).flatMap((item) => [
        { date: item.date, type: "Task", value: item.tasks },
        { date: item.date, type: "Project", value: item.projects },
      ]),
    [health?.activity],
  );

  const columns: TableColumnsType<Attachment> = [
    { title: "Tên file", dataIndex: "originalName", key: "originalName" },
    {
      title: "Uploader",
      key: "uploader",
      render: (_, row) => `@${row.uploader.username}`,
    },
    {
      title: "Dung lượng",
      dataIndex: "sizeBytes",
      key: "sizeBytes",
      render: formatMb,
    },
    {
      title: "Ngày tải lên",
      dataIndex: "uploadedAt",
      key: "uploadedAt",
      render: (value: string) =>
        new Intl.DateTimeFormat("vi-VN", {
          dateStyle: "short",
          timeStyle: "short",
        }).format(new Date(value)),
    },
  ];

  if (loading) return <Skeleton active paragraph={{ rows: 10 }} />;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="text-left">
        <h1 className="text-2xl font-semibold text-gray-900">
          Sức khỏe hệ thống
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Theo dõi kết nối và các chỉ số vận hành quan trọng.
        </p>
      </header>

      {error ? <Alert type="error" showIcon message="Không thể tải dữ liệu hệ thống" /> : null}

      {health ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="rounded-2xl border border-gray-200/80 shadow-sm">
              <Badge
                status={health.database.status === "ok" ? "success" : "error"}
                text={`Database · ${health.database.message}`}
              />
            </Card>
            <Card className="rounded-2xl border border-gray-200/80 shadow-sm">
              <Badge
                status={
                  health.redis.status === "ok"
                    ? "success"
                    : health.redis.status === "error"
                      ? "error"
                      : "default"
                }
                text={`Redis · ${health.redis.message}`}
              />
            </Card>
          </div>

          <Card
            title="Task và project mới trong 7 ngày"
            className="rounded-2xl border border-gray-200/80 shadow-sm"
          >
            {chartData.length ? (
              <Line
                data={chartData}
                xField="date"
                yField="value"
                colorField="type"
                height={300}
                axis={{ y: { min: 0 } }}
                scale={{ color: { range: ["#3b82f6", "#64748b"] } }}
              />
            ) : (
              <Empty description="Chưa có dữ liệu hoạt động" />
            )}
          </Card>

          <Card
            className={`rounded-2xl border shadow-sm ${
              (health.expiredRefreshTokens || 0) > 0
                ? "border-amber-200 bg-amber-50"
                : "border-gray-200/80"
            }`}
          >
            <Statistic
              title="Refresh token hết hạn chưa được dọn"
              value={health.expiredRefreshTokens ?? 0}
              valueStyle={{
                color:
                  (health.expiredRefreshTokens || 0) > 0 ? "#b45309" : "#111827",
              }}
            />
          </Card>

          <Card
            title={`Attachment dung lượng lớn (> ${health.attachmentThresholdMb} MB)`}
            className="rounded-2xl border border-gray-200/80 shadow-sm"
            styles={{ body: { padding: 0 } }}
          >
            <Table<Attachment>
              rowKey="id"
              columns={columns}
              dataSource={health.largeAttachments || []}
              pagination={false}
              scroll={{ x: 720 }}
              locale={{ emptyText: "Không có attachment vượt ngưỡng" }}
              rowClassName={(_, index) =>
                `${index % 2 ? "bg-gray-50/50" : "bg-white"} border-b border-gray-100 hover:bg-gray-100`
              }
            />
          </Card>
        </>
      ) : null}
    </div>
  );
}
