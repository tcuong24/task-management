"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Input,
  Select,
  Table,
  Tag,
  Typography,
} from "antd";
import type { TableColumnsType } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import {
  AccountStatus,
  AdminUserSummary,
  getAdminUsers,
  PlatformRole,
} from "../../../services/admin";
import { isAbortError } from "../../../services/auth";

const { Text } = Typography;
const AVATAR_COLORS = [
  "#475569",
  "#2563eb",
  "#0f766e",
  "#6d28d9",
  "#b45309",
  "#be123c",
];

function avatarColor(username: string) {
  let hash = 0;
  for (let index = 0; index < username.length; index += 1) {
    hash = username.charCodeAt(index) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatDate(value: string | null) {
  if (!value) return "Chưa đăng nhập";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AccountStatus | undefined>();
  const [platformRole, setPlatformRole] = useState<PlatformRole | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError(false);
        const response = await getAdminUsers({
          search: search.trim() || undefined,
          status,
          platformRole,
          page,
          pageSize,
        }, controller.signal);
        setUsers(response.users);
        setTotal(response.pagination.total);
      } catch (err) {
        if (isAbortError(err)) return;
        console.error("Failed to load admin users:", err);
        setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [page, pageSize, platformRole, search, status]);

  const columns: TableColumnsType<AdminUserSummary> = [
    {
      title: "Người dùng",
      key: "user",
      render: (_, record) => (
        <Link
          href={`/admin/users/${record.id}`}
          className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Avatar
            src={record.avatarUrl || undefined}
            style={
              !record.avatarUrl
                ? { backgroundColor: avatarColor(record.username) }
                : undefined
            }
            className="font-semibold text-white"
          >
            {!record.avatarUrl
              ? record.fullName.trim().charAt(0).toUpperCase() || "U"
              : null}
          </Avatar>
          <div className="min-w-0 text-left">
            <p className="truncate text-sm font-semibold text-gray-900">
              {record.fullName}
            </p>
            <p className="truncate text-xs text-gray-500">@{record.username}</p>
          </div>
        </Link>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      render: (email: string | null) =>
        email ? (
          <span className="text-sm text-gray-600">{email}</span>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Quyền nền tảng",
      dataIndex: "platformRole",
      key: "platformRole",
      render: (role: PlatformRole) => (
        <Tag color={role === "ADMIN" ? "gold" : "default"}>{role}</Tag>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (value: AccountStatus) => (
        <Tag color={value === "ACTIVE" ? "green" : "red"}>
          {value === "ACTIVE" ? "Hoạt động" : "Đã khóa"}
        </Tag>
      ),
    },
    {
      title: "Tổ chức",
      dataIndex: "organizationCount",
      key: "organizationCount",
      align: "center",
    },
    {
      title: "Đăng nhập gần nhất",
      dataIndex: "lastLoginAt",
      key: "lastLoginAt",
      render: (value: string | null) => (
        <span className="whitespace-nowrap text-sm text-gray-500">
          {formatDate(value)}
        </span>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 110,
      render: (_, record) => (
        <Link href={`/admin/users/${record.id}`}>
          <Button
            type="link"
            className="h-11 px-2 font-semibold text-blue-600 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Chi tiết
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="text-left">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Người dùng
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Tra cứu và quản lý trạng thái tài khoản trên toàn nền tảng.
        </p>
      </header>

      {error ? (
        <Alert
          type="error"
          showIcon
          message="Không thể tải dữ liệu"
          description="Vui lòng thử lại sau."
          className="rounded-2xl border border-red-100"
        />
      ) : null}

      <Card
        className="rounded-2xl border border-gray-200/80 bg-white shadow-sm"
        styles={{ body: { padding: 0 } }}
      >
        <div className="flex flex-col gap-3 border-b border-gray-200/80 bg-gray-50/50 p-4 md:flex-row">
          <Input
            allowClear
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            prefix={<SearchOutlined className="text-gray-400" />}
            placeholder="Tìm theo email hoặc username"
            aria-label="Tìm người dùng"
            className="h-11 rounded-xl border-gray-200 md:max-w-sm"
          />
          <Select<AccountStatus>
            allowClear
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            placeholder="Trạng thái"
            aria-label="Lọc theo trạng thái"
            className="h-11 min-w-44"
            options={[
              { value: "ACTIVE", label: "Hoạt động" },
              { value: "SUSPENDED", label: "Đã khóa" },
            ]}
          />
          <Select<PlatformRole>
            allowClear
            value={platformRole}
            onChange={(value) => {
              setPlatformRole(value);
              setPage(1);
            }}
            placeholder="Quyền nền tảng"
            aria-label="Lọc theo quyền nền tảng"
            className="h-11 min-w-44"
            options={[
              { value: "USER", label: "User" },
              { value: "ADMIN", label: "Admin" },
            ]}
          />
        </div>

        <Table<AdminUserSummary>
          rowKey="id"
          columns={columns}
          dataSource={users}
          loading={loading}
          scroll={{ x: 920 }}
          rowClassName={(_, index) =>
            `${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"} border-b border-gray-100 transition-colors duration-150 hover:bg-gray-100`
          }
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (value) => `${value} người dùng`,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPageSize !== pageSize ? 1 : nextPage);
              setPageSize(nextPageSize);
            },
          }}
        />
      </Card>
    </div>
  );
}
