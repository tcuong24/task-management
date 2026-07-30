"use client";

import React, { useEffect, useState } from "react";
import { Alert, Card, Empty, List, Skeleton, Statistic, Tag } from "antd";
import {
  ApartmentOutlined,
  ClockCircleOutlined,
  StopOutlined,
  TeamOutlined,
  UserAddOutlined,
  UserSwitchOutlined,
} from "@ant-design/icons";
import {
  AdminOverview,
  getAdminOverview,
  PlatformAuditActivity,
} from "../../services/admin";

const primaryMetrics = [
  {
    key: "totalUsers" as const,
    label: "Tổng người dùng",
    icon: <TeamOutlined />,
    iconClassName: "border-gray-100 bg-gray-50 text-gray-700",
  },
  {
    key: "activeUsers" as const,
    label: "Người dùng hoạt động",
    icon: <UserSwitchOutlined />,
    iconClassName: "border-emerald-100 bg-emerald-50 text-emerald-600",
  },
  {
    key: "totalOrganizations" as const,
    label: "Tổng tổ chức",
    icon: <ApartmentOutlined />,
    iconClassName: "border-gray-100 bg-gray-50 text-gray-700",
  },
  {
    key: "activeOrganizations" as const,
    label: "Tổ chức hoạt động",
    icon: <ApartmentOutlined />,
    iconClassName: "border-emerald-100 bg-emerald-50 text-emerald-600",
  },
];

const secondaryMetrics = [
  {
    key: "newUsersLast7Days" as const,
    label: "Người dùng mới (7 ngày)",
    icon: <UserAddOutlined />,
    alert: false,
    iconClassName: "border-blue-100 bg-blue-50 text-blue-600",
  },
  {
    key: "suspendedOrganizations" as const,
    label: "Tổ chức bị khóa",
    icon: <StopOutlined />,
    alert: true,
    iconClassName: "border-gray-100 bg-gray-50 text-gray-500",
  },
  {
    key: "suspendedUsers" as const,
    label: "Tài khoản bị khóa",
    icon: <StopOutlined />,
    alert: true,
    iconClassName: "border-gray-100 bg-gray-50 text-gray-500",
  },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function actionLabel(activity: PlatformAuditActivity) {
  const labels: Record<string, string> = {
    USER_SUSPENDED: "Đã khóa tài khoản",
    USER_RESTORED: "Đã khôi phục tài khoản",
    SUSPEND_ORG: "Đã khóa tổ chức",
    RESTORE_ORG: "Đã khôi phục tổ chức",
    UPDATE_SETTING: "Đã cập nhật cấu hình",
    ORGANIZATION_SUSPENDED: "Đã khóa tổ chức",
    ORGANIZATION_RESTORED: "Đã khôi phục tổ chức",
  };
  return labels[activity.action] || activity.action;
}

export default function AdminOverviewClient() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(false);
        const response = await getAdminOverview();
        setOverview(response.overview);
      } catch (err) {
        console.error("Failed to load platform overview:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="text-left">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Tổng quan nền tảng
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Theo dõi quy mô và trạng thái hoạt động của TaskFlow.
        </p>
      </header>

      {error ? (
        <Alert
          type="error"
          showIcon
          message="Không thể tải dữ liệu tổng quan"
          description="Vui lòng thử lại sau."
          className="rounded-2xl border border-red-100"
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {primaryMetrics.map((metric) => (
          <Card
            key={metric.key}
            className="rounded-2xl border border-gray-200/80 bg-white shadow-sm transition-shadow duration-150 ease-out hover:shadow-md motion-reduce:transition-none"
          >
            {loading || !overview ? (
              <Skeleton active paragraph={{ rows: 1 }} title={false} />
            ) : (
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-xl ${metric.iconClassName}`}
                  aria-hidden="true"
                >
                  {metric.icon}
                </span>
                <Statistic
                  title={<span className="text-xs font-semibold text-gray-500">{metric.label}</span>}
                  value={overview[metric.key]}
                  valueStyle={{ color: "#111827", fontSize: 24, fontWeight: 700 }}
                />
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {secondaryMetrics.map((metric) => {
          const value = overview?.[metric.key] ?? 0;
          const highlighted = metric.alert && value > 0;

          return (
            <Card
              key={metric.key}
              className="rounded-2xl border border-gray-200/80 bg-white shadow-sm transition-shadow duration-150 ease-out hover:shadow-md motion-reduce:transition-none"
            >
              {loading || !overview ? (
                <Skeleton active paragraph={{ rows: 1 }} title={false} />
              ) : (
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-xl ${
                      highlighted
                        ? "border-red-100 bg-red-50 text-red-600"
                        : metric.iconClassName
                    }`}
                    aria-hidden="true"
                  >
                    {metric.icon}
                  </span>
                  <Statistic
                    title={<span className="text-xs font-semibold text-gray-500">{metric.label}</span>}
                    value={value}
                    valueStyle={{
                      color: highlighted ? "#dc2626" : "#111827",
                      fontSize: 24,
                      fontWeight: 700,
                    }}
                  />
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Card
        title="Hoạt động gần đây"
        className="rounded-2xl border border-gray-200/80 bg-white shadow-sm"
        styles={{ body: { padding: 0 } }}
      >
        {loading ? (
          <div className="p-6">
            <Skeleton active paragraph={{ rows: 4 }} title={false} />
          </div>
        ) : !overview?.recentActivity.length ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Chưa có hoạt động nào được ghi nhận"
            className="py-10"
          />
        ) : (
          <List
            dataSource={overview.recentActivity}
            renderItem={(activity) => (
              <List.Item className="border-b border-gray-100 px-6! py-4!">
                <div className="flex w-full flex-col gap-2 text-left sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold text-gray-900">
                        {activity.actor.fullName}
                      </span>
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Tag
                        color={
                          activity.action.endsWith("_SUSPENDED")
                            ? "red"
                            : activity.action.endsWith("_RESTORED")
                              ? "green"
                              : "default"
                        }
                      >
                        {actionLabel(activity)}
                      </Tag>
                      <Tag>{activity.targetType}</Tag>
                      <span className="truncate font-mono text-xs text-gray-400">
                        {activity.targetId}
                      </span>
                    </div>
                  </div>
                  <span className="flex items-center gap-2 whitespace-nowrap text-xs text-gray-500">
                    <ClockCircleOutlined aria-hidden="true" />
                    {formatDate(activity.createdAt)}
                  </span>
                </div>
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
}
