"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Card,
  DatePicker,
  Empty,
  Select,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { TableColumnsType } from "antd";
import type { Dayjs } from "dayjs";
import {
  AdminUserSummary,
  getAdminAuditLogs,
  getAdminUsers,
  PlatformAuditLog,
} from "../../../services/admin";
import { isAbortError } from "../../../services/auth";

const { RangePicker } = DatePicker;
const { Text } = Typography;

const AVATAR_COLORS = [
  "#475569",
  "#2563eb",
  "#0f766e",
  "#6d28d9",
  "#b45309",
  "#be123c",
];

const ACTION_OPTIONS = [
  { value: "USER_SUSPENDED", label: "Khóa người dùng" },
  { value: "USER_RESTORED", label: "Khôi phục người dùng" },
  { value: "SUSPEND_ORG", label: "Khóa tổ chức" },
  { value: "RESTORE_ORG", label: "Khôi phục tổ chức" },
  { value: "UPDATE_SETTING", label: "Cập nhật cấu hình" },
];

function avatarColor(username: string) {
  let hash = 0;
  for (let index = 0; index < username.length; index += 1) {
    hash = username.charCodeAt(index) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function actionLabel(action: string) {
  const legacyLabels: Record<string, string> = {
    ORGANIZATION_SUSPENDED: "Khóa tổ chức",
    ORGANIZATION_RESTORED: "Khôi phục tổ chức",
  };
  if (legacyLabels[action]) return legacyLabels[action];
  return ACTION_OPTIONS.find((item) => item.value === action)?.label || action;
}

function actionColor(action: string) {
  if (action.includes("SUSPEND")) return "red";
  if (action.includes("RESTORE")) return "green";
  return "default";
}

function JsonValue({ value }: { value: unknown }) {
  return (
    <pre className="max-h-72 overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs leading-5 text-gray-700">
      {value == null ? "Không có dữ liệu" : JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<PlatformAuditLog[]>([]);
  const [actors, setActors] = useState<AdminUserSummary[]>([]);
  const [actorSearch, setActorSearch] = useState("");
  const [actorId, setActorId] = useState<string>();
  const [action, setAction] = useState<string>();
  const [targetType, setTargetType] = useState<string>();
  const [dateRange, setDateRange] = useState<
    [Dayjs | null, Dayjs | null] | null
  >(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actorLoading, setActorLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setActorLoading(true);
        const response = await getAdminUsers({
          search: actorSearch.trim() || undefined,
          page: 1,
          pageSize: 20,
        }, controller.signal);
        setActors(response.users);
      } catch (err) {
        if (isAbortError(err)) return;
        console.error("Failed to search audit actors:", err);
      } finally {
        if (!controller.signal.aborted) setActorLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [actorSearch]);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        setLoading(true);
        setError(false);
        const response = await getAdminAuditLogs({
          actorId,
          action,
          targetType,
          dateFrom: dateRange?.[0]?.startOf("day").toISOString(),
          dateTo: dateRange?.[1]?.endOf("day").toISOString(),
          page,
          pageSize,
        }, controller.signal);
        setLogs(response.logs);
        setTotal(response.pagination.total);
      } catch (err) {
        if (isAbortError(err)) return;
        console.error("Failed to load audit logs:", err);
        setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void load();
    return () => {
      controller.abort();
    };
  }, [action, actorId, dateRange, page, pageSize, targetType]);

  const actorOptions = useMemo(
    () =>
      actors.map((actor) => ({
        value: actor.id,
        label: (
          <span className="flex items-center gap-2">
            <Avatar
              size={24}
              style={{ backgroundColor: avatarColor(actor.username) }}
              className="text-xs font-semibold text-white"
            >
              {actor.username.charAt(0).toUpperCase()}
            </Avatar>
            <span className="truncate">@{actor.username}</span>
          </span>
        ),
      })),
    [actors],
  );

  const columns: TableColumnsType<PlatformAuditLog> = [
    {
      title: "Thời gian",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 150,
      render: (value: string) => (
        <span className="whitespace-nowrap text-sm text-gray-600">
          {formatDate(value)}
        </span>
      ),
    },
    {
      title: "Người thực hiện",
      key: "actor",
      width: 210,
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <Avatar
            style={{ backgroundColor: avatarColor(record.actor.username) }}
            className="shrink-0 font-semibold text-white"
          >
            {record.actor.username.charAt(0).toUpperCase()}
          </Avatar>
          <div className="min-w-0 text-left">
            <p className="truncate text-sm font-semibold text-gray-900">
              @{record.actor.username}
            </p>
            <p className="truncate text-xs text-gray-500">
              {record.actor.email || "—"}
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Hành động",
      dataIndex: "action",
      key: "action",
      width: 190,
      render: (value: string) => (
        <Tag color={actionColor(value)}>{actionLabel(value)}</Tag>
      ),
    },
    {
      title: "Đối tượng",
      key: "target",
      width: 230,
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <Tag>{record.targetType}</Tag>
          <Text
            copyable={{
              text: record.targetId,
              tooltips: ["Sao chép ID", "Đã sao chép"],
            }}
            className="font-mono text-xs text-gray-500"
          >
            {record.targetId.slice(0, 8)}…
          </Text>
        </div>
      ),
    },
    {
      title: "Lý do",
      dataIndex: "reason",
      key: "reason",
      render: (value: string | null) =>
        value ? (
          <Tooltip title={value}>
            <span className="block max-w-sm truncate text-sm text-gray-600">
              {value}
            </span>
          </Tooltip>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="text-left">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Nhật ký nền tảng
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Theo dõi các thao tác quản trị quan trọng trên toàn bộ TaskFlow.
        </p>
      </header>

      {error ? (
        <Alert
          type="error"
          showIcon
          message="Không thể tải nhật ký"
          description="Vui lòng thử lại sau."
          className="rounded-2xl border border-red-100"
        />
      ) : null}

      <Card
        className="rounded-2xl border border-gray-200/80 bg-white shadow-sm"
        styles={{ body: { padding: 0 } }}
      >
        <div className="grid gap-3 border-b border-gray-200/80 bg-gray-50/50 p-4 sm:grid-cols-2 xl:grid-cols-4">
          <Select
            allowClear
            showSearch
            filterOption={false}
            value={actorId}
            onSearch={setActorSearch}
            onChange={(value) => {
              setActorId(value);
              setPage(1);
            }}
            notFoundContent={actorLoading ? "Đang tìm..." : "Không tìm thấy"}
            loading={actorLoading}
            options={actorOptions}
            placeholder="Người thực hiện"
            aria-label="Lọc theo người thực hiện"
            className="h-11 w-full"
          />
          <Select
            allowClear
            value={action}
            onChange={(value) => {
              setAction(value);
              setPage(1);
            }}
            options={ACTION_OPTIONS}
            placeholder="Hành động"
            aria-label="Lọc theo hành động"
            className="h-11 w-full"
          />
          <Select
            allowClear
            value={targetType}
            onChange={(value) => {
              setTargetType(value);
              setPage(1);
            }}
            options={[
              { value: "USER", label: "Người dùng" },
              { value: "ORGANIZATION", label: "Tổ chức" },
              { value: "SETTING", label: "Cấu hình" },
            ]}
            placeholder="Loại đối tượng"
            aria-label="Lọc theo loại đối tượng"
            className="h-11 w-full"
          />
          <RangePicker
            value={dateRange}
            onChange={(value) => {
              setDateRange(value);
              setPage(1);
            }}
            format="DD/MM/YYYY"
            placeholder={["Từ ngày", "Đến ngày"]}
            aria-label="Lọc theo khoảng thời gian"
            className="h-11 w-full rounded-xl border-gray-200"
          />
        </div>

        <Table<PlatformAuditLog>
          rowKey="id"
          columns={columns}
          dataSource={logs}
          loading={loading}
          scroll={{ x: 980 }}
          locale={{
            emptyText: (
              <Empty description="Không có nhật ký nào khớp bộ lọc" />
            ),
          }}
          expandable={{
            expandedRowRender: (record) => (
              <div className="grid gap-4 p-2 text-left md:grid-cols-2">
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Trước
                  </h3>
                  <JsonValue value={record.oldValue} />
                </section>
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Sau
                  </h3>
                  <JsonValue value={record.newValue} />
                </section>
              </div>
            ),
            rowExpandable: (record) =>
              record.oldValue != null || record.newValue != null,
          }}
          rowClassName={(_, index) =>
            `${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"} border-b border-gray-100 transition-colors duration-150 ease-out hover:bg-gray-100 motion-reduce:transition-none`
          }
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (value) => `${value} nhật ký`,
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
