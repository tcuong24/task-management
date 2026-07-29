"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  Avatar,
  Button,
  Input,
  Modal,
  Form,
  Spin,
  App,
  Tag,
  Tooltip,
  Dropdown,
  MenuProps,
} from "antd";
import {
  UserOutlined,
  CheckCircleFilled,
  ExclamationCircleOutlined,
  LockOutlined,
  EditOutlined,
  CameraOutlined,
  BankOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
  PictureOutlined,
  SettingOutlined,
  CheckSquareOutlined,
  RightOutlined,
  InfoCircleOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/vi";
import * as userService from "../../../../../services/user";
import * as orgService from "../../../../../services/organization";
import { RoleBadge } from "../../../../../components/common/RoleBadge";

dayjs.extend(relativeTime);
dayjs.locale("vi");

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
  if (!id) return "#10B981";
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length] || "#10B981";
}

function formatLastLogin(lastLoginAt?: string | null): string {
  if (!lastLoginAt) return "Chưa đăng nhập";
  const loginDate = dayjs(lastLoginAt);
  const now = dayjs();

  if (loginDate.isSame(now, "day")) {
    return `Hôm nay, ${loginDate.format("HH:mm")}`;
  }
  return loginDate.format("DD/MM/YYYY HH:mm");
}

export default function OrgSettingsProfilePage() {
  const router = useRouter();
  const { message } = App.useApp();

  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<userService.UserProfileDetail | null>(null);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);

  // Editable fields state
  const [editingFullName, setEditingFullName] = useState(false);
  const [fullNameInput, setFullNameInput] = useState("");

  const [editingEmail, setEditingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  // Modals state
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarUrlInput, setAvatarUrlInput] = useState("");
  const [updatingAvatar, setUpdatingAvatar] = useState(false);

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordForm] = Form.useForm();

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await userService.getMeDetail();
      if (res.success && res.user) {
        setUser(res.user);
        setFullNameInput(res.user.fullName || "");
        setEmailInput(res.user.email || "");

        if (res.user.memberships && res.user.memberships.length > 0) {
          const firstOrg = res.user.memberships[0]?.organization;
          if (firstOrg) {
            try {
              const tasksRes = await orgService.getMyTasksInOrg(firstOrg.id);
              if (tasksRes.success && tasksRes.tasks) {
                setRecentTasks(tasksRes.tasks.slice(0, 5));
              }
            } catch (err) {
              console.error("Error fetching recent tasks:", err);
            }
          }
        }
      }
    } catch (err: any) {
      console.error("Error fetching user profile:", err);
      message.error(err.message || "Không thể tải thông tin hồ sơ.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Cloudinary File Upload for Avatar
  const handleAvatarFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUpdatingAvatar(true);
      message.loading({
        content: "Đang tải ảnh lên Cloudinary...",
        key: "uploadAvatar",
      });
      const res = await userService.uploadAvatar(file);
      if (res.success && res.user) {
        setUser((prev) =>
          prev ? { ...prev, avatarUrl: res.user.avatarUrl } : null,
        );
        message.success({
          content: "Đã tải ảnh đại diện lên Cloudinary thành công!",
          key: "uploadAvatar",
        });
      }
    } catch (err: any) {
      message.error({
        content: err.message || "Tải ảnh lên thất bại.",
        key: "uploadAvatar",
      });
    } finally {
      setUpdatingAvatar(false);
      if (e.target) e.target.value = "";
    }
  };

  // Reset Avatar to Initials
  const handleResetAvatarToInitials = async () => {
    try {
      setUpdatingAvatar(true);
      const res = await userService.updateMe({ avatarUrl: "" });
      if (res.success) {
        setUser((prev) => (prev ? { ...prev, avatarUrl: null } : null));
        message.success("Đã tạo hình đại diện có tên viết tắt.");
      }
    } catch (err: any) {
      message.error(err.message || "Không thể tạo hình đại diện.");
    } finally {
      setUpdatingAvatar(false);
    }
  };

  const avatarMenuItems: MenuProps["items"] = [
    {
      key: "upload-file",
      icon: <UploadOutlined />,
      label: "Tải ảnh hồ sơ lên",
      onClick: () => avatarFileInputRef.current?.click(),
    },
    {
      key: "reset-initials",
      icon: <UserOutlined />,
      label: "Tạo hình đại diện có tên viết tắt",
      onClick: handleResetAvatarToInitials,
    },
  ];

  // Save Full Name
  const handleSaveFullName = async () => {
    setEditingFullName(false);
    if (!fullNameInput.trim() || fullNameInput === user?.fullName) {
      setFullNameInput(user?.fullName || "");
      return;
    }

    try {
      const res = await userService.updateMe({
        fullName: fullNameInput.trim(),
      });
      if (res.success) {
        setUser((prev) =>
          prev ? { ...prev, fullName: res.user.fullName } : null,
        );
        message.success("Đã cập nhật họ và tên.");
      }
    } catch (err: any) {
      setFullNameInput(user?.fullName || "");
      message.error(err.message || "Không thể cập nhật tên.");
    }
  };

  // Save Email
  const handleSaveEmail = async () => {
    setEditingEmail(false);
    if (!emailInput.trim() || emailInput === user?.email) {
      setEmailInput(user?.email || "");
      return;
    }

    try {
      const res = await userService.updateMe({ email: emailInput.trim() });
      if (res.success) {
        setUser((prev) => (prev ? { ...prev, email: res.user.email } : null));
        message.success("Đã cập nhật email.");
      }
    } catch (err: any) {
      setEmailInput(user?.email || "");
      message.error(err.message || "Không thể cập nhật email.");
    }
  };

  // Save Avatar URL
  const handleSaveAvatar = async () => {
    try {
      setUpdatingAvatar(true);
      const res = await userService.updateMe({
        avatarUrl: avatarUrlInput.trim(),
      });
      if (res.success) {
        setUser((prev) =>
          prev ? { ...prev, avatarUrl: res.user.avatarUrl } : null,
        );
        message.success("Đã cập nhật ảnh đại diện.");
        setAvatarModalOpen(false);
      }
    } catch (err: any) {
      message.error(err.message || "Không thể cập nhật ảnh đại diện.");
    } finally {
      setUpdatingAvatar(false);
    }
  };

  // Change Password Submit
  const handlePasswordSubmit = async (values: any) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error("Xác nhận mật khẩu mới không khớp.");
      return;
    }

    try {
      setPasswordSubmitting(true);
      const res = await userService.changePassword(
        values.oldPassword,
        values.newPassword,
      );
      if (res.success) {
        message.success("Đổi mật khẩu thành công!");
        setPasswordModalOpen(false);
        passwordForm.resetFields();
      }
    } catch (err: any) {
      message.error(err.message || "Không thể đổi mật khẩu.");
    } finally {
      setPasswordSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  const firstLetter = (user.fullName || user.username || "U")
    .charAt(0)
    .toUpperCase();
  const avatarBgColor = getUserAvatarColor(user.id);

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col text-left font-sans">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={avatarFileInputRef}
        onChange={handleAvatarFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Top Banner Cover */}
      <div className="h-44 md:h-52 bg-gray-100 relative overflow-hidden flex items-start justify-end p-4 rounded-t-2xl">
        <Button
          icon={<PictureOutlined />}
          onClick={() => avatarFileInputRef.current?.click()}
          className="relative z-10 bg-white/90 hover:!bg-white text-gray-700 border border-gray-200/80 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 px-3 py-1.5 cursor-pointer"
        >
          Thêm ảnh bìa
        </Button>
      </div>

      {/* User Main Header Card */}
      <div className="px-6 md:px-10 pb-6 border-b border-gray-200/80 relative">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex items-end gap-5">
            <Dropdown
              menu={{ items: avatarMenuItems }}
              trigger={["click"]}
              placement="bottomLeft"
            >
              <div
                className="relative -mt-16 w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-white shadow-lg overflow-hidden flex items-center justify-center text-white text-3xl md:text-4xl font-bold cursor-pointer group shrink-0"
                style={{
                  backgroundColor: !user.avatarUrl ? avatarBgColor : undefined,
                }}
                title="Đổi ảnh hồ sơ"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.fullName || user.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  firstLetter
                )}
                <div className="absolute inset-0 bg-black/45 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-semibold">
                  <EditOutlined className="text-xl" />
                </div>
              </div>
            </Dropdown>

            <div className="flex flex-col gap-1 pb-1">
              <div className="flex items-center gap-3">
                {editingFullName ? (
                  <Input
                    value={fullNameInput}
                    onChange={(e) => setFullNameInput(e.target.value)}
                    onBlur={handleSaveFullName}
                    onPressEnter={handleSaveFullName}
                    autoFocus
                    className="text-2xl font-bold rounded-lg"
                  />
                ) : (
                  <h1
                    className="text-2xl md:text-3xl font-bold text-gray-900 m-0 cursor-pointer hover:text-gray-700 transition-colors flex items-center gap-2 group"
                    onClick={() => setEditingFullName(true)}
                  >
                    <span>{user.fullName || user.username}</span>
                    <EditOutlined className="text-sm text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h1>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="font-mono">@{user.username}</span>
                <span>·</span>
                <span
                  className="cursor-pointer text-gray-700 hover:underline flex items-center gap-1 font-medium"
                  onClick={() => setEditingFullName(true)}
                >
                  + Thêm chức danh công việc
                </span>
              </div>
            </div>
          </div>

          <Button
            icon={<SettingOutlined />}
            onClick={() => {
              passwordForm.resetFields();
              setPasswordModalOpen(true);
            }}
            className="rounded-xl border-gray-200/90 text-gray-700 font-semibold shadow-xs hover:border-gray-300"
          >
            Cài đặt tài khoản
          </Button>
        </div>

        <div className="flex items-center gap-8 mt-6 border-t border-gray-100 pt-4">
          <span className="text-sm font-semibold text-gray-700 border-b-2 border-blue-600 pb-2 cursor-pointer">
            Tổng quan
          </span>
        </div>
      </div>

      {/* 2-Column Body Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-6 md:p-10 bg-slate-50/50">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h3 className="text-base font-bold text-gray-900 m-0">
              Làm việc với tôi
            </h3>
            <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-sm text-sm text-gray-600 leading-relaxed italic hover:border-gray-300 transition-colors cursor-pointer">
              {user.fullName ? (
                <span className="not-italic text-gray-800 font-medium">
                  Tôi là {user.fullName} (@{user.username}). Tôi ưu tiên cập
                  nhật tiến độ công việc trên ứng dụng TaskFlow.
                </span>
              ) : (
                <span>
                  e.g. I prefer async updates in TaskFlow. For urgent questions,
                  ping me between 9am-5pm.
                </span>
              )}
            </div>
          </div>

          {/* Recent Tasks Styled Like Dashboard Activity Timeline */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 m-0 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gray-50 text-gray-700 flex items-center justify-center border border-gray-100">
                  <CheckSquareOutlined className="text-sm" />
                </div>
                <span>Công việc gần đây</span>
              </h3>
            </div>

            {recentTasks.length > 0 ? (
              <div className="flex flex-col divide-y divide-gray-100 border border-gray-200/80 rounded-2xl p-2 bg-white shadow-sm">
                {recentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="py-3 px-3 first:pt-2 last:pb-2 flex items-start gap-3 hover:bg-slate-50/70 rounded-xl transition-colors cursor-pointer group"
                    onClick={() => {
                      const slug = user.memberships?.[0]?.organization?.slug;
                      if (slug && task.projectKey) {
                        router.push(
                          `/dashboard/${slug}/projects/${task.projectKey}`,
                        );
                      } else {
                        router.push("/dashboard");
                      }
                    }}
                  >
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0 mt-0.5">
                      <CheckSquareOutlined className="text-xs" />
                    </div>
                    <div className="flex flex-col flex-grow overflow-hidden">
                      <div className="text-sm text-gray-700 leading-snug">
                        <span className="font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
                          {task.title}
                        </span>
                        <span className="text-xs text-gray-400 font-mono ml-2">
                          [{task.displayCode || `#${task.taskNumber || "TASK"}`}
                          ]
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600">
                          {task.status}
                        </span>
                        <span>·</span>
                        <span>
                          {dayjs(task.updatedAt || task.createdAt).fromNow()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-2xl border border-dashed border-gray-200 bg-white text-center text-xs text-gray-400 font-medium shadow-sm">
                Chưa có công việc nào gần đây.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Standalone Cards for Details & Organizations */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* Card 1: Chi tiết */}
          <Card className="rounded-2xl border border-gray-200/80 shadow-sm bg-white overflow-hidden">
            <h3 className="text-base font-bold text-gray-900 m-0 mb-4 pb-3 border-b border-gray-100">
              Chi tiết
            </h3>

            <div className="flex flex-col gap-3.5 text-sm">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-gray-400">
                  Email
                </span>
                {editingEmail ? (
                  <Input
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onBlur={handleSaveEmail}
                    onPressEnter={handleSaveEmail}
                    autoFocus
                    className="rounded-lg text-sm"
                  />
                ) : (
                  <span
                    className="font-medium text-gray-800 break-all cursor-pointer hover:text-gray-700 transition-colors flex items-center justify-between group"
                    onClick={() => setEditingEmail(true)}
                  >
                    <span>{user.email || "Chưa cập nhật"}</span>
                    <EditOutlined className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-gray-400">
                  Tên đăng nhập
                </span>
                <span className="font-mono font-medium text-gray-700">
                  @{user.username}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-gray-400">
                  Đăng nhập gần nhất
                </span>
                <span className="font-medium text-gray-700 flex items-center gap-1.5">
                  <ClockCircleOutlined className="text-gray-400 text-xs" />
                  {formatLastLogin(user.lastLoginAt)}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-gray-400">
                  Trạng thái xác thực
                </span>
                {user.isVerified ? (
                  <span className="font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircleFilled className="text-xs" />
                    Đã xác thực
                  </span>
                ) : (
                  <span className="font-semibold text-amber-600 flex items-center gap-1">
                    <ExclamationCircleOutlined className="text-xs" />
                    Chưa xác thực
                  </span>
                )}
              </div>
            </div>
          </Card>

          {/* Card 2: Tổ chức đang tham gia */}
          <Card className="rounded-2xl border border-gray-200/80 shadow-sm bg-white overflow-hidden">
            <h3 className="text-base font-bold text-gray-900 m-0 mb-4 pb-3 border-b border-gray-100 flex items-center justify-between">
              <span>Tổ chức đang tham gia</span>
              <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full">
                {user.memberships.length}
              </span>
            </h3>

            <div className="flex flex-col gap-2.5">
              {user.memberships.map((m) => (
                <div
                  key={m.organization.id}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-blue-50/50 transition-colors cursor-pointer border border-gray-100 group"
                  onClick={() =>
                    router.push(`/dashboard/${m.organization.slug}`)
                  }
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      shape="square"
                      className="rounded-xl bg-gray-100 text-gray-700 font-bold text-sm shrink-0"
                    >
                      {m.organization.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <div className="flex flex-col text-left">
                      <span className="font-semibold text-sm text-gray-900 group-hover:text-gray-700 transition-colors">
                        {m.organization.name}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">
                        /{m.organization.slug}
                      </span>
                    </div>
                  </div>

                  <RoleBadge role={m.role} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Avatar Modal */}
      <Modal
        title="Đổi ảnh đại diện"
        open={avatarModalOpen}
        onCancel={() => setAvatarModalOpen(false)}
        onOk={handleSaveAvatar}
        confirmLoading={updatingAvatar}
        okText="Lưu thay đổi"
        cancelText="Hủy"
        centered
      >
        <div className="flex flex-col gap-4 py-3 text-left">
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={() => {
              setAvatarModalOpen(false);
              avatarFileInputRef.current?.click();
            }}
            className="!bg-blue-600 font-semibold"
          >
            Tải ảnh từ máy tính lên Cloudinary
          </Button>

          <div className="text-xs font-semibold text-gray-400 text-center uppercase tracking-wider">
            Hoặc nhập URL hình ảnh
          </div>

          <Input
            placeholder="https://res.cloudinary.com/..."
            value={avatarUrlInput}
            onChange={(e) => setAvatarUrlInput(e.target.value)}
          />
        </div>
      </Modal>

      {/* Password Change Modal */}
      <Modal
        title="Đổi mật khẩu tài khoản"
        open={passwordModalOpen}
        onCancel={() => {
          setPasswordModalOpen(false);
          passwordForm.resetFields();
        }}
        footer={null}
        centered
        width={440}
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handlePasswordSubmit}
          className="mt-4 text-left"
        >
          <Form.Item
            name="oldPassword"
            label="Mật khẩu hiện tại"
            rules={[
              { required: true, message: "Vui lòng nhập mật khẩu hiện tại" },
            ]}
          >
            <Input.Password placeholder="Nhập mật khẩu hiện tại..." />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="Mật khẩu mới"
            rules={[
              { required: true, message: "Vui lòng nhập mật khẩu mới" },
              { min: 6, message: "Mật khẩu phải từ 6 ký tự trở lên" },
            ]}
          >
            <Input.Password placeholder="Nhập mật khẩu mới..." />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Xác nhận mật khẩu mới"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "Vui lòng xác nhận mật khẩu mới" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error("Mật khẩu xác nhận không khớp!"),
                  );
                },
              }),
            ]}
          >
            <Input.Password placeholder="Nhập lại mật khẩu mới..." />
          </Form.Item>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
            <Button onClick={() => setPasswordModalOpen(false)}>Hủy</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={passwordSubmitting}
              className="!bg-blue-600"
            >
              Lưu mật khẩu
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
