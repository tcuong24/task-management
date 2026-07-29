"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  Table,
  Button,
  Select,
  Modal,
  Form,
  Input,
  Spin,
  App,
  Avatar,
  Tooltip,
} from "antd";
import {
  UserAddOutlined,
  ReloadOutlined,
  UserOutlined,
  MailOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "../../../../../hooks/useAuth";
import { useOrg } from "../../../../../contexts/OrgContext";
import * as orgService from "../../../../../services/organization";
import { RoleBadge } from "../../../../../components/common/RoleBadge";
import { StatusBadge } from "../../../../../components/common/StatusBadge";
import type { OrgRole } from "@repo/permissions";

const AVATAR_PALETTE = [
  "#10B981",
  "#3B82F6",
  "#6366F1",
  "#8B5CF6",
  "#EC4899",
  "#F59E0B",
  "#EF4444",
  "#06B6D4",
];

function getUserAvatarColor(id?: string | null): string {
  if (!id) return "#9CA3AF";
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length] || "#9CA3AF";
}

interface TeamRowItem {
  id: string;
  userId: string;
  name: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  role: OrgRole;
  status: "ACTIVE" | "INVITED" | "SUSPENDED";
  joinedAt: string;
  isInvitation?: boolean;
  invitationId?: string;
}

export default function TeamPage() {
  const { message } = App.useApp();
  const { user: currentUser } = useAuth();
  const { currentOrg, userRole } = useOrg();
  const orgId = currentOrg?.id;

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<orgService.OrgMember[]>([]);
  const [invitations, setInvitations] = useState<orgService.OrgInvitation[]>(
    [],
  );

  // Invite Modal State
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteForm] = Form.useForm();

  const isAdminOrOwner = userRole === "ADMIN" || userRole === "OWNER";

  const fetchTeamData = useCallback(async () => {
    if (!orgId) return;
    try {
      setLoading(true);
      const res = await orgService.getMembers(orgId);
      if (res.success) {
        setMembers(res.members || []);
        setInvitations(res.invitations || []);
      }
    } catch (err: any) {
      console.error("Error fetching members:", err);
      message.error(err.message || "Không thể tải danh sách thành viên.");
    } finally {
      setLoading(false);
    }
  }, [orgId, message]);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  // Handle Role Change
  const handleRoleChange = async (memberId: string, newRole: OrgRole) => {
    if (!orgId) return;
    try {
      await orgService.updateMemberRole(orgId, memberId, newRole);
      message.success("Đã cập nhật vai trò thành viên.");
      fetchTeamData();
    } catch (err: any) {
      message.error(err.message || "Không thể cập nhật vai trò.");
    }
  };

  // Handle Reactivate Member
  const handleReactivateMember = async (memberId: string) => {
    if (!orgId) return;
    try {
      await orgService.updateMemberStatus(orgId, memberId, "ACTIVE");
      message.success("Đã kích hoạt lại thành viên.");
      fetchTeamData();
    } catch (err: any) {
      message.error(err.message || "Không thể kích hoạt lại thành viên.");
    }
  };

  // Handle Resend Invitation
  const handleResendInvite = async (invitationId: string) => {
    if (!orgId) return;
    try {
      await orgService.resendInvitation(orgId, invitationId);
      message.success("Đã gửi lại lời mời thành công.");
    } catch (err: any) {
      message.error(err.message || "Không thể gửi lại lời mời.");
    }
  };

  // Handle Submit Invite Member
  const handleInviteSubmit = async (values: any) => {
    if (!orgId) return;
    try {
      setInviteSubmitting(true);
      await orgService.inviteMember(orgId, values.email.trim(), values.role);
      message.success("Đã gửi lời mời thành công!");
      setInviteModalOpen(false);
      inviteForm.resetFields();
      fetchTeamData();
    } catch (err: any) {
      message.error(err.message || "Không thể gửi lời mời.");
    } finally {
      setInviteSubmitting(false);
    }
  };

  // Build Unified Table Rows
  const tableData: TeamRowItem[] = useMemo(() => {
    const memberRows: TeamRowItem[] = members.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.user?.fullName || m.user?.username || "User",
      username: m.user?.username || "",
      email: m.user?.email || "",
      avatarUrl: m.user?.avatarUrl || null,
      role: m.role,
      status: m.status,
      joinedAt: m.joinedAt,
      isInvitation: false,
    }));

    const inviteRows: TeamRowItem[] = invitations.map((inv) => ({
      id: `inv-${inv.id}`,
      userId: `inv-${inv.id}`,
      name: inv.email.split("@")[0] || inv.email,
      username: inv.email,
      email: inv.email,
      avatarUrl: null,
      role: inv.invitedRole,
      status: "INVITED",
      joinedAt: inv.createdAt,
      isInvitation: true,
      invitationId: inv.id,
    }));

    return [...memberRows, ...inviteRows];
  }, [members, invitations]);

  const columns = [
    {
      title: "THÀNH VIÊN",
      dataIndex: "name",
      key: "name",
      render: (_: any, record: TeamRowItem) => {
        const isSelf = currentUser?.id === record.userId;
        const initial = record.name.charAt(0).toUpperCase();

        return (
          <div className="flex items-center gap-3">
            <Avatar
              src={record.avatarUrl || undefined}
              style={{ backgroundColor: getUserAvatarColor(record.userId) }}
              className="font-bold shrink-0"
              size={36}
            >
              {initial}
            </Avatar>
            <div className="flex flex-col text-left leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-gray-900 text-sm">
                  {record.name}
                </span>
                {isSelf && (
                  <span className="text-[11px] font-medium text-gray-700 bg-gray-50 px-1.5 py-0.2 rounded border border-gray-100">
                    (bạn)
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-400 font-mono">
                {record.email ? record.email : `@${record.username}`}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      title: "VAI TRÒ",
      dataIndex: "role",
      key: "role",
      width: 180,
      render: (role: OrgRole, record: TeamRowItem) => {
        const isSelf = currentUser?.id === record.userId;
        const canEditRole =
          isAdminOrOwner &&
          !isSelf &&
          !record.isInvitation &&
          record.role !== "OWNER";

        if (canEditRole) {
          return (
            <Select
              value={role}
              onChange={(val) => handleRoleChange(record.id, val)}
              size="small"
              className="w-32"
            >
              <Select.Option value="ADMIN">ADMIN</Select.Option>
              <Select.Option value="MEMBER">MEMBER</Select.Option>
              <Select.Option value="GUEST">GUEST</Select.Option>
            </Select>
          );
        }

        return <RoleBadge role={role} />;
      },
    },
    {
      title: "TRẠNG THÁI",
      dataIndex: "status",
      key: "status",
      width: 150,
      render: (status: string) => <StatusBadge status={status} />,
    },
    {
      title: "THAM GIA / HÀNH ĐỘNG",
      key: "actions",
      width: 220,
      render: (_: any, record: TeamRowItem) => {
        if (record.status === "ACTIVE") {
          return (
            <span className="text-xs text-gray-500 font-medium">
              {dayjs(record.joinedAt).format("DD/MM/YYYY")}
            </span>
          );
        }

        if (record.status === "INVITED" && record.invitationId) {
          return isAdminOrOwner ? (
            <Button
              type="link"
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => handleResendInvite(record.invitationId!)}
              className="p-0 text-gray-700 hover:text-gray-800 font-semibold text-xs"
            >
              Gửi lại lời mời
            </Button>
          ) : (
            <span className="text-xs text-gray-400 italic">
              Đang chờ phản hồi
            </span>
          );
        }

        if (record.status === "SUSPENDED") {
          return isAdminOrOwner ? (
            <Button
              type="link"
              size="small"
              onClick={() => handleReactivateMember(record.id)}
              className="p-0 text-emerald-600 hover:text-emerald-700 font-semibold text-xs"
            >
              Kích hoạt lại
            </Button>
          ) : (
            <span className="text-xs text-gray-400 italic">
              Tài khoản bị khóa
            </span>
          );
        }

        return null;
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6 text-left animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-gray-900 m-0">
            Thành viên tổ chức
          </h1>
          <span className="text-xs font-semibold text-gray-400 mt-1">
            {currentOrg?.name || "Tổ chức"} · {tableData.length} thành viên
          </span>
        </div>

        {isAdminOrOwner && (
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={() => {
              inviteForm.resetFields();
              setInviteModalOpen(true);
            }}
            className="!bg-blue-600 rounded-xl shadow-sm hover:!bg-blue-700"
          >
            + Mời thành viên
          </Button>
        )}
      </div>

      {/* Members Table */}
      <Table
        columns={columns}
        dataSource={tableData}
        rowKey="id"
        loading={loading}
        pagination={false}
        rowClassName={(record) =>
          record.status === "SUSPENDED" ? "opacity-60 bg-gray-50/50" : ""
        }
        className="rounded-xl overflow-hidden border border-gray-100 shadow-sm"
      />

      {/* Invite Member Modal */}
      <Modal
        title="Mời thành viên mới"
        open={inviteModalOpen}
        onCancel={() => {
          setInviteModalOpen(false);
          inviteForm.resetFields();
        }}
        footer={null}
        centered
        width={480}
      >
        <Form
          form={inviteForm}
          layout="vertical"
          onFinish={handleInviteSubmit}
          initialValues={{ role: "MEMBER" }}
          className="mt-4"
        >
          <Form.Item
            name="email"
            label="Địa chỉ Email người nhận"
            rules={[
              { required: true, message: "Vui lòng nhập địa chỉ Email" },
              { type: "email", message: "Địa chỉ Email không hợp lệ" },
            ]}
          >
            <Input
              prefix={<MailOutlined className="text-gray-400" />}
              placeholder="username@example.com"
            />
          </Form.Item>

          <Form.Item
            name="role"
            label="Vai trò cấp quyền"
            rules={[{ required: true, message: "Vui lòng chọn vai trò" }]}
          >
            <Select>
              <Select.Option value="ADMIN">
                ADMIN - Quản trị viên (Xem, sửa, quản lý dự án & thành viên)
              </Select.Option>
              <Select.Option value="MEMBER">
                MEMBER - Thành viên (Tạo task, xem dự án)
              </Select.Option>
              <Select.Option value="GUEST">
                GUEST - Khách (Chỉ xem nội dung)
              </Select.Option>
            </Select>
          </Form.Item>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
            <Button onClick={() => setInviteModalOpen(false)}>Hủy</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={inviteSubmitting}
              className="!bg-blue-600"
            >
              Gửi lời mời
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
