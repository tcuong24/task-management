"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Alert,
  App,
  Avatar,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Skeleton,
  Statistic,
  Table,
  Tabs,
  Tag,
  Tooltip,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  ApartmentOutlined,
  ArrowLeftOutlined,
  AuditOutlined,
  CheckCircleOutlined,
  CrownOutlined,
  LockOutlined,
} from "@ant-design/icons";
import {
  AdminUserDetail,
  AdminUserMembership,
  getAdminAuditLogs,
  getAdminUser,
  PlatformAuditLog,
  restoreAdminUser,
  suspendAdminUser,
} from "../../../../services/admin";
import { isAbortError } from "../../../../services/auth";

interface ActionFormValues {
  reason: string;
}

const AUDIT_PAGE_SIZE = 10;
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
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function roleTag(role: AdminUserMembership["role"]) {
  const color =
    role === "OWNER" ? "gold" : role === "ADMIN" ? "blue" : "default";
  return <Tag color={color}>{role}</Tag>;
}

function memberStatusTag(status: AdminUserMembership["status"]) {
  const config = {
    ACTIVE: { color: "green", label: "Đang hoạt động" },
    INVITED: { color: "gold", label: "Đã mời" },
    SUSPENDED: { color: "red", label: "Đã khóa" },
  }[status];

  return <Tag color={config.color}>{config.label}</Tag>;
}

function actionLabel(action: string) {
  const labels: Record<string, string> = {
    USER_SUSPENDED: "Khóa người dùng",
    USER_RESTORED: "Mở khóa người dùng",
  };
  return labels[action] || action;
}

function actionColor(action: string) {
  if (action.includes("SUSPEND")) return "red";
  if (action.includes("RESTORE")) return "green";
  return "default";
}

function isFormValidationError(
  error: unknown,
): error is { errorFields: unknown[] } {
  return (
    typeof error === "object" &&
    error !== null &&
    "errorFields" in error
  );
}

function highestRole(memberships: AdminUserMembership[]) {
  const order: AdminUserMembership["role"][] = [
    "OWNER",
    "ADMIN",
    "MEMBER",
    "GUEST",
  ];
  return (
    order.find((role) =>
      memberships.some((membership) => membership.role === role),
    ) || "—"
  );
}

function ReadOnlyField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="text-left">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <div className="flex min-h-11 items-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
        {children}
      </div>
    </div>
  );
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const userId = params.id;
  const { message } = App.useApp();
  const [form] = Form.useForm<ActionFormValues>();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [auditLogs, setAuditLogs] = useState<PlatformAuditLog[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const [auditError, setAuditError] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);

  const loadUser = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setLoading(true);
        setError(false);
        const response = await getAdminUser(userId, signal);
        setUser(response.user);
      } catch (err) {
        if (isAbortError(err)) return;
        console.error("Failed to load admin user:", err);
        setError(true);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [userId],
  );

  const loadAuditLogs = useCallback(
    async (page: number, signal?: AbortSignal) => {
      try {
        setAuditLoading(true);
        setAuditError(false);
        const response = await getAdminAuditLogs(
          {
            targetId: userId,
            targetType: "USER",
            page,
            pageSize: AUDIT_PAGE_SIZE,
          },
          signal,
        );
        setAuditLogs(response.logs);
        setAuditTotal(response.pagination.total);
      } catch (err) {
        if (isAbortError(err)) return;
        console.error("Failed to load user audit logs:", err);
        setAuditError(true);
      } finally {
        if (!signal?.aborted) setAuditLoading(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadUser(controller.signal);
    return () => controller.abort();
  }, [loadUser]);

  useEffect(() => {
    const controller = new AbortController();
    void loadAuditLogs(auditPage, controller.signal);
    return () => controller.abort();
  }, [auditPage, loadAuditLogs]);

  const handleAction = async () => {
    if (!user) return;

    try {
      const values = await form.validateFields();
      setSubmitting(true);

      if (user.status === "ACTIVE") {
        await suspendAdminUser(user.id, values.reason.trim());
        message.success("Đã khóa tài khoản.");
      } else {
        await restoreAdminUser(user.id, values.reason.trim());
        message.success("Đã mở khóa tài khoản.");
      }

      setActionOpen(false);
      form.resetFields();
      const reloadUser = loadUser();
      if (auditPage === 1) {
        await Promise.all([reloadUser, loadAuditLogs(1)]);
      } else {
        setAuditPage(1);
        await reloadUser;
      }
    } catch (err: unknown) {
      if (isFormValidationError(err)) return;
      console.error("Failed to update admin user status:", err);
      message.error("Không thể cập nhật trạng thái tài khoản.");
    } finally {
      setSubmitting(false);
    }
  };

  const membershipColumns: TableColumnsType<AdminUserMembership> = [
    {
      title: "Tên tổ chức",
      key: "organization",
      render: (_, record) => (
        <div className="text-left">
          <p className="font-medium text-gray-900">
            {record.organization.name}
          </p>
          <p className="text-xs text-gray-500">
            /{record.organization.slug}
          </p>
        </div>
      ),
    },
    {
      title: "Vai trò trong tổ chức",
      dataIndex: "role",
      key: "role",
      width: 180,
      render: (role: AdminUserMembership["role"]) => roleTag(role),
    },
    {
      title: "Trạng thái thành viên",
      dataIndex: "status",
      key: "status",
      width: 190,
      render: (status: AdminUserMembership["status"]) =>
        memberStatusTag(status),
    },
    {
      title: "Ngày tham gia",
      dataIndex: "joinedAt",
      key: "joinedAt",
      width: 180,
      render: (value: string) => (
        <span className="whitespace-nowrap text-sm text-gray-500">
          {formatDate(value)}
        </span>
      ),
    },
  ];

  const auditColumns: TableColumnsType<PlatformAuditLog> = [
    {
      title: "Thời gian",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (value: string) => (
        <span className="whitespace-nowrap text-sm text-gray-500">
          {formatDate(value)}
        </span>
      ),
    },
    {
      title: "Hành động",
      dataIndex: "action",
      key: "action",
      width: 180,
      render: (action: string) => (
        <Tag color={actionColor(action)}>{actionLabel(action)}</Tag>
      ),
    },
    {
      title: "Người thực hiện",
      key: "actor",
      width: 210,
      render: (_, record) => (
        <div className="text-left">
          <p className="font-medium text-gray-900">
            {record.actor.fullName}
          </p>
          <p className="text-xs text-gray-500">@{record.actor.username}</p>
        </div>
      ),
    },
    {
      title: "Lý do",
      dataIndex: "reason",
      key: "reason",
      render: (reason: string | null) =>
        reason ? (
          <Tooltip title={reason}>
            <span className="block max-w-sm truncate text-sm text-gray-600">
              {reason}
            </span>
          </Tooltip>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
  ];

  const role = useMemo(
    () => highestRole(user?.memberships || []),
    [user?.memberships],
  );

  if (loading) {
    return (
      <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-3">
        <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <Skeleton active avatar paragraph={{ rows: 10 }} />
        </Card>
        <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm lg:col-span-2">
          <Skeleton active paragraph={{ rows: 12 }} />
        </Card>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <Alert
          type="error"
          showIcon
          message="Không thể tải người dùng"
          description="Vui lòng thử lại sau."
          className="rounded-2xl border border-red-100"
        />
        <Link href="/admin/users" className="text-blue-600 hover:underline">
          Quay lại danh sách người dùng
        </Link>
      </div>
    );
  }

  const suspending = user.status === "ACTIVE";
  const profileInitial =
    user.fullName.trim().charAt(0).toUpperCase() ||
    user.username.charAt(0).toUpperCase() ||
    "U";

  const tabs = [
    {
      key: "organizations",
      label: `Tổ chức tham gia (${user.memberships.length})`,
      children: (
        <Table<AdminUserMembership>
          rowKey="id"
          columns={membershipColumns}
          dataSource={user.memberships}
          pagination={false}
          scroll={{ x: 760 }}
          locale={{
            emptyText: (
              <Empty description="Người dùng chưa tham gia tổ chức nào" />
            ),
          }}
          onRow={(record) => ({
            tabIndex: 0,
            role: "link",
            "aria-label": `Xem tổ chức ${record.organization.name}`,
            onClick: () =>
              router.push(`/admin/organizations/${record.organization.id}`),
            onKeyDown: (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                router.push(`/admin/organizations/${record.organization.id}`);
              }
            },
          })}
          rowClassName={(_, index) =>
            `${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"} cursor-pointer border-b border-gray-100 transition-colors duration-150 ease-out hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 motion-reduce:transition-none`
          }
        />
      ),
    },
    {
      key: "audit",
      label: `Nhật ký hoạt động (${auditTotal})`,
      children: auditError ? (
        <Alert
          type="error"
          showIcon
          message="Không thể tải nhật ký hoạt động"
          description="Vui lòng thử lại sau."
          className="mb-4 rounded-xl border border-red-100"
        />
      ) : (
        <Table<PlatformAuditLog>
          rowKey="id"
          columns={auditColumns}
          dataSource={auditLogs}
          loading={auditLoading}
          scroll={{ x: 760 }}
          pagination={{
            current: auditPage,
            pageSize: AUDIT_PAGE_SIZE,
            total: auditTotal,
            showSizeChanger: false,
            hideOnSinglePage: true,
            onChange: setAuditPage,
          }}
          locale={{
            emptyText: (
              <Empty description="Chưa có hoạt động nào được ghi nhận" />
            ),
          }}
          rowClassName={(_, index) =>
            `${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"} border-b border-gray-100 transition-colors duration-150 ease-out hover:bg-gray-100 motion-reduce:transition-none`
          }
        />
      ),
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="flex items-center gap-3 text-left">
        <Link
          href="/admin/users"
          aria-label="Quay lại danh sách người dùng"
          className="flex h-11 w-11  shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700! transition-colors duration-150 ease-out hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 motion-reduce:transition-none"
        >
          <ArrowLeftOutlined />
        </Link>
      </header>

      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm lg:sticky ">
          <div className="flex flex-col items-center border-b border-gray-100 pb-6 text-center">
            <Avatar
              size={96}
              src={user.avatarUrl || undefined}
              style={
                !user.avatarUrl
                  ? { backgroundColor: avatarColor(user.username) }
                  : undefined
              }
              className="text-3xl font-semibold text-white"
            >
              {!user.avatarUrl ? profileInitial : null}
            </Avatar>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <h2 className="text-xl font-semibold text-gray-900">
                {user.fullName}
              </h2>
              <Tag color={user.status === "ACTIVE" ? "green" : "red"}>
                {user.status === "ACTIVE" ? "Đang hoạt động" : "Đã khóa"}
              </Tag>
            </div>
            <p className="mt-1 text-sm text-gray-500">@{user.username}</p>

            <Button
              block
              danger={suspending}
              type="primary"
              icon={
                suspending ? <LockOutlined /> : <CheckCircleOutlined />
              }
              onClick={() => setActionOpen(true)}
              className={`mt-6 min-h-11 rounded-xl border-none px-5 font-semibold text-white shadow-md transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 motion-reduce:transition-none ${
                suspending
                  ? "bg-red-600 hover:bg-red-700 focus-visible:ring-red-500"
                  : "bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500"
              }`}
            >
              {suspending ? "Khóa tài khoản" : "Mở khóa tài khoản"}
            </Button>
          </div>

          <div className="mt-6 flex flex-col gap-4">
            <ReadOnlyField label="Email">
              {user.email || <span className="text-gray-400">—</span>}
            </ReadOnlyField>
            <ReadOnlyField label="Username">@{user.username}</ReadOnlyField>
            <ReadOnlyField label="Quyền nền tảng">
              <Tag color={user.platformRole === "ADMIN" ? "gold" : "default"}>
                {user.platformRole}
              </Tag>
            </ReadOnlyField>
            <ReadOnlyField label="Đăng nhập gần nhất">
              {formatDate(user.lastLoginAt)}
            </ReadOnlyField>

            {user.status === "SUSPENDED" ? (
              <>
                <ReadOnlyField label="Lý do khóa">
                  {user.suspendReason || (
                    <span className="text-gray-400">—</span>
                  )}
                </ReadOnlyField>
                <ReadOnlyField label="Khóa bởi">
                  {user.suspendedByUser ? (
                    <span>
                      {user.suspendedByUser.fullName}{" "}
                      <span className="text-gray-500">
                        (@{user.suspendedByUser.username})
                      </span>
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </ReadOnlyField>
                <ReadOnlyField label="Thời điểm khóa">
                  {formatDate(user.suspendedAt)}
                </ReadOnlyField>
              </>
            ) : null}
          </div>
        </Card>

        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="flex items-start justify-between gap-3!">
                <Statistic
                  title="Tổ chức tham gia"
                  value={user.organizationCount}
                  valueStyle={{ color: "#111827" }}
                />
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-lg text-gray-600">
                  <ApartmentOutlined />
                </span>
              </div>
            </Card>

            <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <Statistic
                  title="Vai trò cao nhất"
                  value={role}
                  valueStyle={{ color: "#111827", fontSize: 24 }}
                />
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-lg text-gray-600">
                  <CrownOutlined />
                </span>
              </div>
            </Card>

            <Card
              loading={auditLoading && auditTotal === 0}
              className="rounded-2xl border border-gray-100 bg-white shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <Statistic
                  title="Hoạt động ghi nhận"
                  value={auditTotal}
                  valueStyle={{ color: "#111827" }}
                />
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-lg text-gray-600">
                  <AuditOutlined />
                </span>
              </div>
            </Card>
          </div>

          <Card
            className="rounded-2xl border border-gray-100 bg-white shadow-sm"
            styles={{ body: { padding: 0 } }}
          >
            <div className="p-4">
              <Tabs
                defaultActiveKey="organizations"
                items={tabs}
              />
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={actionOpen}
        title={suspending ? "Khóa tài khoản" : "Mở khóa tài khoản"}
        okText={suspending ? "Xác nhận khóa" : "Xác nhận mở khóa"}
        cancelText="Hủy"
        confirmLoading={submitting}
        okButtonProps={{ danger: suspending }}
        maskClosable={false}
        centered
        onOk={() => void handleAction()}
        onCancel={() => {
          if (submitting) return;
          setActionOpen(false);
          form.resetFields();
        }}
        classNames={{ container: "rounded-2xl shadow-2xl" }}
      >
        <p className="mb-4 text-sm leading-6 text-gray-600">
          {suspending
            ? `Tài khoản ${user.fullName} sẽ mất quyền truy cập TaskFlow.`
            : `Tài khoản ${user.fullName} sẽ được phép đăng nhập trở lại.`}
        </p>
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item
            name="reason"
            label={<span className="font-medium text-gray-700">Lý do</span>}
            rules={[
              {
                required: true,
                whitespace: true,
                message: "Vui lòng nhập lý do.",
              },
              { max: 1000, message: "Lý do tối đa 1000 ký tự." },
            ]}
          >
            <Input.TextArea
              rows={4}
              maxLength={1000}
              showCount
              placeholder={
                suspending
                  ? "Nhập lý do khóa tài khoản"
                  : "Nhập lý do mở khóa tài khoản"
              }
              className="rounded-xl border-gray-200"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
