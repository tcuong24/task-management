"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../../hooks/useAuth";
import { useOrg } from "../../../../contexts/OrgContext";
import { OrgRole, hasPermission } from "@repo/permissions";
import {
  Card,
  Table,
  Tag,
  Button,
  Avatar,
  Space,
  App,
  Popconfirm,
  Select,
  Modal,
  Form,
  Input,
  AutoComplete,
  Spin,
  Alert,
} from "antd";
import CustomTooltip from "../../../../components/common/CustomTooltip";
import {
  UserOutlined,
  PlusOutlined,
  DeleteOutlined,
  SwapOutlined,
  LockOutlined,
  UnlockOutlined,
} from "@ant-design/icons";
import * as orgService from "../../../../services/organization";
import * as userService from "../../../../services/user";

const ROLE_COLORS: Record<string, string> = {
  OWNER: "gold",
  ADMIN: "blue",
  MEMBER: "green",
  GUEST: "default",
};

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Chủ sở hữu",
  ADMIN: "Quản trị viên",
  MEMBER: "Thành viên",
  GUEST: "Khách",
};

export default function OrgMembersPage() {
  const { message } = App.useApp();
  const { user: currentUser } = useAuth();
  const { currentOrg, userRole: currentUserRole } = useOrg();
  const orgId = currentOrg?.id;

  const [members, setMembers] = useState<orgService.OrgMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState<boolean>(true);

  // Invite Modal State
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteForm] = Form.useForm();

  // User search auto-complete state
  const [searchResults, setSearchResults] = useState<userService.SearchUser[]>(
    [],
  );

  // Role Change Modal State
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] =
    useState<orgService.OrgMember | null>(null);
  const [newRole, setNewRole] = useState<OrgRole>("MEMBER");
  const [updatingRole, setUpdatingRole] = useState(false);

  // Load Members
  const fetchMembers = useCallback(async () => {
    if (!orgId) return;
    try {
      setLoadingMembers(true);
      const res = await orgService.getMembers(orgId);
      if (res.success) {
        setMembers(res.members);
      }
    } catch (err: any) {
      console.error("Error fetching members:", err);
    } finally {
      setLoadingMembers(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Handle User Search for AutoComplete
  const handleUserSearch = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await userService.searchUsers(query);
      if (res.success) {
        setSearchResults(res.users);
      }
    } catch (err) {
      console.error("Error searching users:", err);
    }
  };

  const handleInviteFinish = async (values: {
    email: string;
    role: OrgRole;
  }) => {
    if (!orgId) return;
    try {
      setInviting(true);
      await orgService.inviteMember(orgId, values.email, values.role);
      message.success(`Đã gửi lời mời tới ${values.email}`);
      setInviteModalOpen(false);
      inviteForm.resetFields();
      setSearchResults([]);
      fetchMembers();
    } catch (err: any) {
      message.error(err.message || "Gửi lời mời thất bại.");
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateStatus = async (
    memberId: string,
    currentStatus: string,
  ) => {
    if (!orgId) return;
    const targetStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      await orgService.updateMemberStatus(orgId, memberId, targetStatus);
      message.success(
        targetStatus === "SUSPENDED"
          ? "Đã tạm khóa thành viên"
          : "Đã kích hoạt lại thành viên",
      );
      fetchMembers();
    } catch (err: any) {
      message.error(err.message || "Thao tác thất bại.");
    }
  };

  const handleConfirmRoleChange = async () => {
    if (!orgId || !selectedMember) return;
    try {
      setUpdatingRole(true);
      await orgService.updateMemberRole(orgId, selectedMember.id, newRole);
      message.success("Cập nhật vai trò thành công!");
      setRoleModalOpen(false);
      fetchMembers();
    } catch (err: any) {
      message.error(err.message || "Thay đổi vai trò thất bại.");
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!orgId) return;
    try {
      await orgService.removeMember(orgId, memberId);
      message.success("Đã xóa thành viên khỏi tổ chức.");
      fetchMembers();
    } catch (err: any) {
      message.error(err.message || "Xóa thành viên thất bại.");
    }
  };

  const canInvite =
    currentUserRole && hasPermission(currentUserRole, "member:invite");

  const columns = [
    {
      title: "Thành viên",
      key: "user",
      render: (_: any, record: orgService.OrgMember) => {
        const isMe = record.userId === currentUser?.id;
        return (
          <div className="flex items-center gap-3">
            <Avatar
              src={record.user.avatarUrl}
              icon={!record.user.avatarUrl ? <UserOutlined /> : undefined}
              className="bg-gray-100 text-gray-700 border border-gray-200"
              size={40}
            >
              {record.user.fullName?.charAt(0) ||
                record.user.username?.charAt(0)}
            </Avatar>
            <div className="flex flex-col text-left">
              <span className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
                {record.user.fullName || record.user.username}
                {isMe && (
                  <span className="text-[10px] bg-gray-50 text-gray-700 px-1.5 py-0.5 rounded border border-gray-100 font-normal">
                    Tôi
                  </span>
                )}
              </span>
              <span className="text-xs text-gray-400">
                @{record.user.username}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      title: "Email",
      dataIndex: ["user", "email"],
      key: "email",
      render: (email: string) => (
        <span className="text-sm text-gray-600">{email || "—"}</span>
      ),
    },
    {
      title: "Vai trò",
      dataIndex: "role",
      key: "role",
      render: (role: string) => (
        <Tag
          color={ROLE_COLORS[role]}
          className="font-bold px-2.5 py-0.5 rounded-full text-xs"
        >
          {ROLE_LABELS[role] || role}
        </Tag>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        if (status === "ACTIVE")
          return <Tag color="success">Đang hoạt động</Tag>;
        if (status === "INVITED") return <Tag color="processing">Đã mời</Tag>;
        return <Tag color="error">Đã khóa</Tag>;
      },
    },
    {
      title: "Thao tác",
      key: "actions",
      render: (_: any, record: orgService.OrgMember) => {
        const isMe = record.userId === currentUser?.id;
        const isOwner = record.role === "OWNER";
        const canManage =
          currentUserRole === "OWNER" ||
          (currentUserRole === "ADMIN" && record.role !== "OWNER");

        if (!canManage || isMe)
          return <span className="text-xs text-gray-300">—</span>;

        return (
          <Space size="middle">
            <CustomTooltip title="Đổi vai trò">
              <Button
                type="text"
                icon={<SwapOutlined />}
                onClick={() => {
                  setSelectedMember(record);
                  setNewRole(record.role);
                  setRoleModalOpen(true);
                }}
                className="text-gray-700 hover:bg-gray-50"
              />
            </CustomTooltip>

            <CustomTooltip
              title={record.status === "ACTIVE" ? "Tạm khóa" : "Kích hoạt"}
            >
              <Button
                type="text"
                icon={
                  record.status === "ACTIVE" ? (
                    <LockOutlined />
                  ) : (
                    <UnlockOutlined />
                  )
                }
                onClick={() => handleUpdateStatus(record.id, record.status)}
                className={
                  record.status === "ACTIVE"
                    ? "text-amber-600 hover:bg-amber-50"
                    : "text-emerald-600 hover:bg-emerald-50"
                }
              />
            </CustomTooltip>

            {!isOwner && (
              <Popconfirm
                title="Xóa thành viên khỏi tổ chức?"
                description="Hành động này sẽ thu hồi toàn bộ quyền truy cập của người dùng trong tổ chức."
                onConfirm={() => handleRemoveMember(record.id)}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div className="p-3 md:p-4 flex flex-col gap-6  mx-auto w-full text-left">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
            Quản lý thành viên (Team)
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-0.5">
            Danh sách các thành viên và phân quyền trong tổ chức{" "}
            {currentOrg?.name}.
          </p>
        </div>

        {canInvite && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setInviteModalOpen(true)}
            className="bg-blue-600 border-none font-semibold text-white shadow-sm hover:bg-blue-700 rounded-xl h-[42px] px-5"
          >
            Mời thành viên mới
          </Button>
        )}
      </div>

      {/* Members Table */}
      <Card
        className="border border-gray-100 shadow-sm rounded-2xl bg-white overflow-hidden"
        styles={{ body: { padding: 0 } }}
      >
        <Table
          dataSource={members}
          columns={columns}
          rowKey="id"
          loading={loadingMembers}
          pagination={false}
        />
      </Card>

      {/* Invite Member Modal */}
      <Modal
        title={
          <span className="font-bold text-gray-800 text-lg">
            Mời thành viên mới
          </span>
        }
        open={inviteModalOpen}
        onCancel={() => {
          inviteForm.resetFields();
          setSearchResults([]);
          setInviteModalOpen(false);
        }}
        footer={null}
        centered
        width={480}
      >
        <Form
          form={inviteForm}
          layout="vertical"
          onFinish={handleInviteFinish}
          className="mt-4"
        >
          <Form.Item
            label={
              <span className="text-gray-700 text-sm font-semibold">
                Tìm kiếm người dùng hoặc nhập email
              </span>
            }
            name="email"
            rules={[
              { required: true, message: "Vui lòng nhập email hoặc username." },
            ]}
          >
            <AutoComplete
              onSearch={handleUserSearch}
              popupClassName="rounded-xl shadow-lg border border-gray-100"
              options={searchResults.map((u) => ({
                key: u.id,
                value: u.email || u.username,
                label: (
                  <div className="flex items-center gap-2.5 py-1 text-left">
                    <Avatar
                      src={u.avatarUrl}
                      size={24}
                      className="bg-gray-100 text-gray-700 font-bold"
                    >
                      {u.fullName?.charAt(0) || u.username?.charAt(0)}
                    </Avatar>
                    <div className="flex flex-col text-xs leading-tight">
                      <span className="font-bold text-gray-800">
                        {u.fullName || u.username}
                      </span>
                      <span className="text-gray-400">{u.email}</span>
                    </div>
                  </div>
                ),
              }))}
            >
              <Input placeholder="Nhập email hoặc username..." />
            </AutoComplete>
          </Form.Item>

          <Form.Item
            label={
              <span className="text-gray-700 text-sm font-semibold">
                Vai trò
              </span>
            }
            name="role"
            initialValue="MEMBER"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: "ADMIN", label: "Quản trị viên (ADMIN)" },
                { value: "MEMBER", label: "Thành viên (MEMBER)" },
                { value: "GUEST", label: "Khách (GUEST)" },
              ]}
              popupClassName="rounded-xl shadow-lg"
            />
          </Form.Item>

          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={() => setInviteModalOpen(false)}>Hủy</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={inviting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Gửi lời mời
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Change Role Modal */}
      <Modal
        title={
          <span className="font-bold text-gray-800 text-lg">
            Đổi vai trò thành viên
          </span>
        }
        open={roleModalOpen}
        onCancel={() => setRoleModalOpen(false)}
        footer={null}
        centered
        width={420}
      >
        {selectedMember && (
          <div className="flex flex-col gap-4 mt-2 text-left">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <Avatar
                src={selectedMember.user.avatarUrl}
                icon={
                  !selectedMember.user.avatarUrl ? <UserOutlined /> : undefined
                }
                className="bg-gray-100 text-gray-700 font-bold"
                size={36}
              >
                {selectedMember.user.fullName?.charAt(0)}
              </Avatar>
              <div className="flex flex-col text-left">
                <span className="font-bold text-sm text-gray-800">
                  {selectedMember.user.fullName}
                </span>
                <span className="text-xs text-gray-400">
                  @{selectedMember.user.username}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-700">
                Chọn vai trò mới:
              </label>
              <Select
                value={newRole}
                onChange={setNewRole}
                className="w-full"
                options={[
                  { value: "ADMIN", label: "Quản trị viên (ADMIN)" },
                  { value: "MEMBER", label: "Thành viên (MEMBER)" },
                  { value: "GUEST", label: "Khách (GUEST)" },
                ]}
                popupClassName="rounded-xl shadow-lg"
              />
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button onClick={() => setRoleModalOpen(false)}>Hủy</Button>
              <Button
                type="primary"
                loading={updatingRole}
                onClick={handleConfirmRoleChange}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Lưu thay đổi
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
