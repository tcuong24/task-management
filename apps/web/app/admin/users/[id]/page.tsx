"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Alert,
  App,
  Avatar,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  Modal,
  Skeleton,
  Table,
  Tag,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  LockOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  AdminUserDetail,
  AdminUserMembership,
  getAdminUser,
  restoreAdminUser,
  suspendAdminUser,
} from "../../../../services/admin";

interface ActionFormValues {
  reason: string;
}

function formatDate(value: string | null) {
  if (!value) return "Chưa có dữ liệu";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = params.id;
  const { message } = App.useApp();
  const [form] = Form.useForm<ActionFormValues>();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);

  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const response = await getAdminUser(userId);
      setUser(response.user);
    } catch (err) {
      console.error("Failed to load admin user:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const handleAction = async () => {
    if (!user) return;
    const values = await form.validateFields();

    try {
      setSubmitting(true);
      if (user.status === "ACTIVE") {
        await suspendAdminUser(user.id, values.reason.trim());
        message.success("Đã khóa tài khoản.");
      } else {
        await restoreAdminUser(user.id, values.reason.trim());
        message.success("Đã khôi phục tài khoản.");
      }
      setActionOpen(false);
      form.resetFields();
      await loadUser();
    } catch (err: any) {
      if (err?.errorFields) return;
      console.error("Failed to update admin user status:", err);
      message.error("Không thể cập nhật trạng thái tài khoản.");
    } finally {
      setSubmitting(false);
    }
  };

  const membershipColumns: TableColumnsType<AdminUserMembership> = [
    {
      title: "Tổ chức",
      key: "organization",
      render: (_, record) => (
        <div className="text-left">
          <p className="font-medium text-gray-900">{record.organization.name}</p>
          <p className="text-xs text-gray-500">/{record.organization.slug}</p>
        </div>
      ),
    },
    {
      title: "Vai trò",
      dataIndex: "role",
      key: "role",
      render: (role: AdminUserMembership["role"]) => <Tag>{role}</Tag>,
    },
    {
      title: "Trạng thái thành viên",
      dataIndex: "status",
      key: "status",
      render: (status: AdminUserMembership["status"]) => (
        <Tag color={status === "ACTIVE" ? "green" : status === "SUSPENDED" ? "red" : "gold"}>
          {status}
        </Tag>
      ),
    },
    {
      title: "Ngày tham gia",
      dataIndex: "joinedAt",
      key: "joinedAt",
      render: (value: string) => (
        <span className="text-sm text-gray-500">{formatDate(value)}</span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <Card className="rounded-2xl border border-gray-200/80 bg-white shadow-sm">
          <Skeleton active avatar paragraph={{ rows: 8 }} />
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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-left">
          <Link
            href="/admin/users"
            aria-label="Quay lại danh sách người dùng"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 transition-colors duration-150 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <ArrowLeftOutlined />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              Chi tiết người dùng
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Thông tin tài khoản và các tổ chức đang tham gia.
            </p>
          </div>
        </div>

        <Button
          danger={suspending}
          type={suspending ? "primary" : "default"}
          icon={suspending ? <LockOutlined /> : <CheckCircleOutlined />}
          onClick={() => setActionOpen(true)}
          className={
            suspending
              ? "h-11 rounded-xl border-none bg-red-600 px-5 font-semibold text-white shadow-md hover:bg-red-700"
              : "h-11 rounded-xl border border-gray-200 bg-white px-5 font-semibold text-gray-700 hover:bg-gray-50"
          }
        >
          {suspending ? "Khóa tài khoản" : "Khôi phục tài khoản"}
        </Button>
      </header>

      <Card className="rounded-2xl border border-gray-200/80 bg-white shadow-sm">
        <div className="mb-6 flex items-center gap-4 border-b border-gray-100 pb-6">
          <Avatar
            size={64}
            src={user.avatarUrl || undefined}
            icon={!user.avatarUrl ? <UserOutlined /> : undefined}
            className="bg-gray-100 text-gray-700"
          />
          <div className="min-w-0 text-left">
            <h2 className="truncate text-xl font-semibold text-gray-900">
              {user.fullName}
            </h2>
            <p className="text-sm text-gray-500">@{user.username}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Tag color={user.platformRole === "ADMIN" ? "gold" : "default"}>
                {user.platformRole}
              </Tag>
              <Tag color={user.status === "ACTIVE" ? "green" : "red"}>
                {user.status === "ACTIVE" ? "Hoạt động" : "Đã khóa"}
              </Tag>
            </div>
          </div>
        </div>

        <Descriptions column={{ xs: 1, sm: 2 }} colon={false}>
          <Descriptions.Item label="Email">
            {user.email || "Chưa cập nhật"}
          </Descriptions.Item>
          <Descriptions.Item label="Email xác minh">
            {user.isVerified ? "Đã xác minh" : "Chưa xác minh"}
          </Descriptions.Item>
          <Descriptions.Item label="Đăng nhập gần nhất">
            {formatDate(user.lastLoginAt)}
          </Descriptions.Item>
          <Descriptions.Item label="Ngày tạo">
            {formatDate(user.createdAt)}
          </Descriptions.Item>
          {user.status === "SUSPENDED" ? (
            <>
              <Descriptions.Item label="Khóa lúc">
                {formatDate(user.suspendedAt)}
              </Descriptions.Item>
              <Descriptions.Item label="Lý do khóa">
                {user.suspendReason || "Không có"}
              </Descriptions.Item>
            </>
          ) : null}
        </Descriptions>
      </Card>

      <Card
        title="Tổ chức đang tham gia"
        className="rounded-2xl border border-gray-200/80 bg-white shadow-sm"
        styles={{ body: { padding: 0 } }}
      >
        <Table<AdminUserMembership>
          rowKey="id"
          columns={membershipColumns}
          dataSource={user.memberships}
          pagination={false}
          scroll={{ x: 720 }}
          locale={{ emptyText: "Người dùng chưa tham gia tổ chức nào." }}
          rowClassName={(_, index) =>
            `${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"} border-b border-gray-100 transition-colors duration-150 hover:bg-gray-100`
          }
        />
      </Card>

      <Modal
        open={actionOpen}
        title={suspending ? "Khóa tài khoản" : "Khôi phục tài khoản"}
        okText={suspending ? "Xác nhận khóa" : "Xác nhận khôi phục"}
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
              { required: true, whitespace: true, message: "Vui lòng nhập lý do." },
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
                  : "Nhập lý do khôi phục tài khoản"
              }
              className="rounded-xl border-gray-200"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
