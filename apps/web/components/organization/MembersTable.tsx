"use client";

import React, { useState } from "react";
import { Table, Avatar, Select, Button, message } from "antd";
import {
  UserOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { OrgRole } from "@repo/permissions";
import {
  OrgMember,
  updateMemberRole,
  removeMember,
} from "../../services/organization";
import { useOrgPermissions } from "../../hooks/useOrgPermissions";
import { useAuth } from "../../hooks/useAuth";
import { RoleBadge } from "../common/RoleBadge";
import { StatusBadge } from "../common/StatusBadge";
import { customConfirm } from "../common/CustomConfirmModal";

const { Option } = Select;

interface MembersTableProps {
  organizationId: string;
  members: OrgMember[];
  loading: boolean;
  onRefresh: () => void;
}

export default function MembersTable({
  organizationId,
  members,
  loading,
  onRefresh,
}: MembersTableProps) {
  const { user } = useAuth();
  const { canChangeRole, canRemoveMember } = useOrgPermissions();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleRoleChange = async (memberId: string, newRole: OrgRole) => {
    try {
      setUpdatingId(memberId);
      const res = await updateMemberRole(organizationId, memberId, newRole);
      if (res.success) {
        message.success("Thay đổi vai trò thành viên thành công.");
        onRefresh();
      }
    } catch (err: any) {
      if (err.status === 403) {
        message.error("Bạn không có quyền thực hiện hành động này.");
      } else {
        message.error(err.message || "Lỗi khi thay đổi vai trò.");
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteConfirm = (member: OrgMember) => {
    customConfirm({
      variant: "danger",
      title: (
        <span className="font-extrabold text-gray-800 text-lg">
          Xóa thành viên?
        </span>
      ),
      content: (
        <span className="text-sm text-gray-600 leading-normal">
          Xóa <strong>{member.user.fullName}</strong> khỏi tổ chức? Hành động
          này không thể hoàn tác.
        </span>
      ),
      okText: "Xóa thành viên",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          const res = await removeMember(organizationId, member.id);
          if (res.success) {
            message.success(`Đã xóa ${member.user.fullName} khỏi tổ chức.`);
            onRefresh();
          }
        } catch (err: any) {
          if (err.status === 403) {
            message.error("Bạn không có quyền thực hiện hành động này.");
          } else {
            message.error(err.message || "Lỗi khi xóa thành viên.");
          }
        }
      },
    });
  };

  const columns = [
    {
      title: "Thành viên",
      key: "user",
      render: (_: any, record: OrgMember) => (
        <div className="flex items-center gap-3 text-left">
          <Avatar
            icon={!record.user.avatarUrl ? <UserOutlined /> : undefined}
            src={record.user.avatarUrl}
            className="bg-gray-50 text-gray-700 border border-gray-100/50"
            size={36}
          />
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-gray-800">
              {record.user.fullName}
            </span>
            <span className="text-xs text-gray-400">
              @{record.user.username}
            </span>
          </div>
        </div>
      ),
    },
    {
      title: "Email",
      dataIndex: ["user", "email"],
      key: "email",
      render: (text: string) => (
        <span className="text-sm text-gray-500 font-medium">{text}</span>
      ),
    },
    {
      title: "Vai trò",
      dataIndex: "role",
      key: "role",
      render: (role: OrgRole) => <RoleBadge role={role} />,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status: string) => <StatusBadge status={status} />,
    },
    {
      title: "Hành động",
      key: "actions",
      render: (_: any, record: OrgMember) => {
        const isSelf = record.user.username === user?.username;
        const isTargetOwner = record.role === "OWNER";

        // Conditions to show/hide edit role & remove actions
        const showChangeRole = canChangeRole && !isSelf && !isTargetOwner;
        const showRemove = canRemoveMember && !isSelf && !isTargetOwner;

        if (!showChangeRole && !showRemove) return null;

        return (
          <div className="flex items-center gap-3 justify-center">
            {showChangeRole && (
              <Select
                size="small"
                value={record.role}
                onChange={(val) => handleRoleChange(record.id, val as OrgRole)}
                loading={updatingId === record.id}
                className="w-32 rounded-lg text-left"
                popupClassName="rounded-xl overflow-hidden"
              >
                <Option value="MEMBER">MEMBER</Option>
                <Option value="ADMIN">ADMIN</Option>
              </Select>
            )}

            {showRemove && (
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteConfirm(record)}
                className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 hover:text-red-700 rounded-lg h-7 w-7 flex items-center justify-center p-0"
                title="Xóa thành viên"
              />
            )}
          </div>
        );
      },
    },
  ];

  return (
    <Table
      dataSource={members}
      columns={columns}
      rowKey="id"
      loading={loading}
      pagination={false}
      className="custom-table"
      rowClassName={(record, idx) =>
        `${idx % 2 === 0 ? "bg-slate-50/20" : "bg-white"} hover:bg-blue-50/70 transition-colors`
      }
    />
  );
}
