"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Empty,
  Input,
  Select,
  Table,
  Tag,
  Typography,
} from "antd";
import type { TableColumnsType } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import {
  AdminOrganizationSummary,
  getAdminOrganizations,
  OrganizationStatus,
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

function avatarColor(slug: string) {
  let hash = 0;
  for (let index = 0; index < slug.length; index += 1) {
    hash = slug.charCodeAt(index) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function statusTag(status: OrganizationStatus) {
  const config = {
    ACTIVE: { color: "green", label: "Hoạt động" },
    SUSPENDED: { color: "red", label: "Đã khóa" },
    PENDING_DELETION: { color: "orange", label: "Chờ xóa" },
  }[status];
  return <Tag color={config.color}>{config.label}</Tag>;
}

export default function AdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState<
    AdminOrganizationSummary[]
  >([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OrganizationStatus>();
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
        const response = await getAdminOrganizations({
          search: search.trim() || undefined,
          status,
          page,
          pageSize,
        }, controller.signal);
        setOrganizations(response.organizations);
        setTotal(response.pagination.total);
      } catch (err) {
        if (isAbortError(err)) return;
        console.error("Failed to load admin organizations:", err);
        setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [page, pageSize, search, status]);

  const columns: TableColumnsType<AdminOrganizationSummary> = [
    {
      title: "Tổ chức",
      key: "organization",
      width: 260,
      render: (_, record) => (
        <Link
          href={`/admin/organizations/${record.id}`}
          className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Avatar
            src={record.avatarUrl || undefined}
            style={
              record.avatarUrl
                ? undefined
                : { backgroundColor: avatarColor(record.slug) }
            }
            className="shrink-0 font-semibold text-white"
          >
            {record.avatarUrl ? null : record.name.charAt(0).toUpperCase()}
          </Avatar>
          <div className="min-w-0 text-left">
            <p className="truncate text-sm font-semibold text-gray-900">
              {record.name}
            </p>
            <p className="truncate text-xs text-gray-500">/{record.slug}</p>
          </div>
        </Link>
      ),
    },
    {
      title: "Owner",
      key: "owner",
      width: 220,
      render: (_, record) =>
        record.owner ? (
          <div className="text-left">
            <p className="text-sm font-medium text-gray-900">
              @{record.owner.username}
            </p>
            <p className="truncate text-xs text-gray-500">
              {record.owner.email || "—"}
            </p>
          </div>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Thành viên",
      dataIndex: "memberCount",
      key: "memberCount",
      align: "center",
      width: 110,
    },
    {
      title: "Project",
      dataIndex: "projectCount",
      key: "projectCount",
      align: "center",
      width: 100,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: statusTag,
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
      render: (value: string) => (
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
        <Link href={`/admin/organizations/${record.id}`}>
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
          Tổ chức
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Theo dõi quy mô và trạng thái các tổ chức trên nền tảng.
        </p>
      </header>

      {error ? (
        <Alert
          type="error"
          showIcon
          message="Không thể tải danh sách tổ chức"
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
            placeholder="Tìm theo tên hoặc slug"
            aria-label="Tìm tổ chức"
            className="h-11 rounded-xl border-gray-200 md:max-w-sm"
          />
          <Select<OrganizationStatus>
            allowClear
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            placeholder="Trạng thái"
            aria-label="Lọc theo trạng thái"
            className="h-11 min-w-52"
            options={[
              { value: "ACTIVE", label: "Hoạt động" },
              { value: "SUSPENDED", label: "Đã khóa" },
              { value: "PENDING_DELETION", label: "Chờ xóa" },
            ]}
          />
        </div>

        <Table<AdminOrganizationSummary>
          rowKey="id"
          columns={columns}
          dataSource={organizations}
          loading={loading}
          scroll={{ x: 1050 }}
          locale={{
            emptyText: (
              <Empty description="Không có tổ chức nào khớp bộ lọc" />
            ),
          }}
          rowClassName={(_, index) =>
            `${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"} border-b border-gray-100 transition-colors duration-150 ease-out hover:bg-gray-100 motion-reduce:transition-none`
          }
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (value) => `${value} tổ chức`,
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
