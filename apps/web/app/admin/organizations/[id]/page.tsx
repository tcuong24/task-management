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
} from "@ant-design/icons";
import {
  AdminOrganizationDetail,
  AdminOrganizationMember,
  AdminOrganizationProject,
  getAdminOrganization,
  OrganizationStatus,
  restoreAdminOrganization,
  suspendAdminOrganization,
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

function statusTag(status: OrganizationStatus) {
  const config = {
    ACTIVE: { color: "green", label: "Hoạt động" },
    SUSPENDED: { color: "red", label: "Đã khóa" },
    PENDING_DELETION: { color: "orange", label: "Chờ xóa" },
  }[status];
  return <Tag color={config.color}>{config.label}</Tag>;
}

export default function AdminOrganizationDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = params.id;
  const { message } = App.useApp();
  const [form] = Form.useForm<ActionFormValues>();
  const [organization, setOrganization] =
    useState<AdminOrganizationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);

  const loadOrganization = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const response = await getAdminOrganization(organizationId);
      setOrganization(response.organization);
    } catch (err) {
      console.error("Failed to load admin organization:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void loadOrganization();
  }, [loadOrganization]);

  const handleAction = async () => {
    if (!organization) return;
    const values = await form.validateFields();

    try {
      setSubmitting(true);
      if (organization.status === "ACTIVE") {
        await suspendAdminOrganization(organization.id, values.reason.trim());
        message.success("Đã khóa tổ chức.");
      } else if (organization.status === "SUSPENDED") {
        await restoreAdminOrganization(organization.id, values.reason.trim());
        message.success("Đã khôi phục tổ chức.");
      }
      setActionOpen(false);
      form.resetFields();
      await loadOrganization();
    } catch (err: any) {
      if (err?.errorFields) return;
      console.error("Failed to update organization status:", err);
      message.error("Không thể cập nhật trạng thái tổ chức.");
    } finally {
      setSubmitting(false);
    }
  };

  const memberColumns: TableColumnsType<AdminOrganizationMember> = [
    {
      title: "Thành viên",
      key: "user",
      render: (_, record) => (
        <div className="text-left">
          <p className="font-medium text-gray-900">@{record.user.username}</p>
          <p className="text-xs text-gray-500">{record.user.email || "—"}</p>
        </div>
      ),
    },
    {
      title: "Vai trò",
      dataIndex: "role",
      key: "role",
      render: (role: AdminOrganizationMember["role"]) => (
        <Tag color={role === "OWNER" ? "gold" : "default"}>{role}</Tag>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status: AdminOrganizationMember["status"]) => (
        <Tag
          color={
            status === "ACTIVE"
              ? "green"
              : status === "SUSPENDED"
                ? "red"
                : "gold"
          }
        >
          {status}
        </Tag>
      ),
    },
    {
      title: "Ngày tham gia",
      dataIndex: "joinedAt",
      key: "joinedAt",
      render: (value: string) => (
        <span className="whitespace-nowrap text-sm text-gray-500">
          {formatDate(value)}
        </span>
      ),
    },
  ];

  const projectColumns: TableColumnsType<AdminOrganizationProject> = [
    {
      title: "Dự án",
      key: "project",
      render: (_, record) => (
        <div className="text-left">
          <p className="font-medium text-gray-900">{record.name}</p>
          <p className="font-mono text-xs text-gray-500">{record.key}</p>
        </div>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status: string) => <Tag>{status}</Tag>,
    },
    {
      title: "Số task",
      dataIndex: "taskCounter",
      key: "taskCounter",
      align: "center",
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

  if (error || !organization) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <Alert
          type="error"
          showIcon
          message="Không thể tải tổ chức"
          description="Vui lòng thử lại sau."
          className="rounded-2xl border border-red-100"
        />
        <Link href="/admin/organizations" className="text-blue-600 hover:underline">
          Quay lại danh sách tổ chức
        </Link>
      </div>
    );
  }

  const suspending = organization.status === "ACTIVE";
  const actionable =
    organization.status === "ACTIVE" || organization.status === "SUSPENDED";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-left">
          <Link
            href="/admin/organizations"
            aria-label="Quay lại danh sách tổ chức"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 transition-colors duration-150 ease-out hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 motion-reduce:transition-none"
          >
            <ArrowLeftOutlined />
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-gray-900">
                {organization.name}
              </h1>
              {statusTag(organization.status)}
            </div>
            <p className="mt-1 text-sm text-gray-500">/{organization.slug}</p>
          </div>
        </div>

        {actionable ? (
          <Button
            danger={suspending}
            type={suspending ? "primary" : "default"}
            icon={suspending ? <LockOutlined /> : <CheckCircleOutlined />}
            onClick={() => setActionOpen(true)}
            className={
              suspending
                ? "h-11 rounded-xl border-none bg-red-600 px-5 font-semibold text-white shadow-md transition-colors duration-150 ease-out hover:bg-red-700 motion-reduce:transition-none"
                : "h-11 rounded-xl border border-gray-200 bg-white px-5 font-semibold text-gray-700 transition-colors duration-150 ease-out hover:bg-gray-50 motion-reduce:transition-none"
            }
          >
            {suspending ? "Khóa tổ chức" : "Khôi phục tổ chức"}
          </Button>
        ) : null}
      </header>

      <Card
        title="Thông tin chung"
        className="rounded-2xl border border-gray-200/80 bg-white shadow-sm"
      >
        <Descriptions column={{ xs: 1, sm: 2 }} colon={false}>
          <Descriptions.Item label="Owner">
            {organization.owner
              ? `@${organization.owner.username}${
                  organization.owner.email
                    ? ` · ${organization.owner.email}`
                    : ""
                }`
              : "Chưa xác định"}
          </Descriptions.Item>
          <Descriptions.Item label="Ngày tạo">
            {formatDate(organization.createdAt)}
          </Descriptions.Item>
          <Descriptions.Item label="Số thành viên">
            {organization.memberCount}
          </Descriptions.Item>
          <Descriptions.Item label="Số project">
            {organization.projectCount}
          </Descriptions.Item>
          {organization.status === "SUSPENDED" ? (
            <>
              <Descriptions.Item label="Lý do khóa">
                {organization.suspendReason || "Không có"}
              </Descriptions.Item>
              <Descriptions.Item label="Khóa lúc">
                {formatDate(organization.suspendedAt)}
              </Descriptions.Item>
              <Descriptions.Item label="Người đã khóa">
                {organization.suspendedByUser
                  ? `@${organization.suspendedByUser.username}`
                  : "Không xác định"}
              </Descriptions.Item>
            </>
          ) : null}
        </Descriptions>
      </Card>

      <Card
        title="Thành viên"
        className="rounded-2xl border border-gray-200/80 bg-white shadow-sm"
        styles={{ body: { padding: 0 } }}
      >
        <Table<AdminOrganizationMember>
          rowKey="id"
          columns={memberColumns}
          dataSource={organization.members}
          pagination={false}
          scroll={{ x: 680 }}
          locale={{ emptyText: "Tổ chức chưa có thành viên." }}
          rowClassName={(_, index) =>
            `${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"} border-b border-gray-100 transition-colors duration-150 ease-out hover:bg-gray-100 motion-reduce:transition-none`
          }
        />
      </Card>

      <Card
        title="Dự án"
        className="rounded-2xl border border-gray-200/80 bg-white shadow-sm"
        styles={{ body: { padding: 0 } }}
      >
        <Table<AdminOrganizationProject>
          rowKey="id"
          columns={projectColumns}
          dataSource={organization.projects}
          pagination={false}
          scroll={{ x: 560 }}
          locale={{ emptyText: "Tổ chức chưa có dự án." }}
          rowClassName={(_, index) =>
            `${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"} border-b border-gray-100 transition-colors duration-150 ease-out hover:bg-gray-100 motion-reduce:transition-none`
          }
        />
      </Card>

      <Modal
        open={actionOpen}
        title={suspending ? "Khóa tổ chức" : "Khôi phục tổ chức"}
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
            ? `Tổ chức ${organization.name} sẽ bị ngừng truy cập trên TaskFlow.`
            : `Tổ chức ${organization.name} sẽ được phép hoạt động trở lại.`}
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
                  ? "Nhập lý do khóa tổ chức"
                  : "Nhập lý do khôi phục tổ chức"
              }
              className="rounded-xl border-gray-200"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
