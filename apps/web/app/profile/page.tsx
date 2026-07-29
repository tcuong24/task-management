'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Card,
  Button,
  Input,
  Modal,
  Form,
  Spin,
  App,
  Tag,
  Tooltip,
  Table,
  Select,
  Avatar,
  Dropdown,
  MenuProps,
} from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  CheckCircleFilled,
  ExclamationCircleOutlined,
  LockOutlined,
  EditOutlined,
  CameraOutlined,
  BankOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
  ArrowLeftOutlined,
  PictureOutlined,
  SettingOutlined,
  CheckSquareOutlined,
  RightOutlined,
  InfoCircleOutlined,
  UserAddOutlined,
  ReloadOutlined,
  MailOutlined,
  SearchOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import { useAuth } from '../../hooks/useAuth';
import * as userService from '../../services/user';
import * as orgService from '../../services/organization';
import { RoleBadge } from '../../components/common/RoleBadge';
import { StatusBadge } from '../../components/common/StatusBadge';
import type { OrgRole } from '@repo/permissions';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const AVATAR_PALETTE = [
  '#10B981', '#3B82F6', '#6366F1', '#8B5CF6',
  '#EC4899', '#F59E0B', '#EF4444', '#06B6D4',
];

function getUserAvatarColor(id?: string | null): string {
  if (!id) return '#10B981';
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length] || '#10B981';
}

function formatLastLogin(lastLoginAt?: string | null): string {
  if (!lastLoginAt) return 'Chưa đăng nhập';
  const loginDate = dayjs(lastLoginAt);
  const now = dayjs();

  if (loginDate.isSame(now, 'day')) {
    return `Hôm nay, ${loginDate.format('HH:mm')}`;
  }
  return loginDate.format('DD/MM/YYYY HH:mm');
}

interface TeamRowItem {
  id: string;
  userId: string;
  name: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  role: OrgRole;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  joinedAt: string;
  isInvitation?: boolean;
  invitationId?: string;
}

export default function StandaloneProfilePage() {
  const router = useRouter();
  const { message } = App.useApp();
  const { user: authUser } = useAuth();

  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'profile' | 'team' | 'people'>('profile');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<userService.UserProfileDetail | null>(null);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);

  // Team state
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [members, setMembers] = useState<orgService.OrgMember[]>([]);
  const [invitations, setInvitations] = useState<orgService.OrgInvitation[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

  // People (All Users) state
  const [allUsers, setAllUsers] = useState<userService.PlatformUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [peopleSearch, setPeopleSearch] = useState('');

  // Invite Modal State
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteForm] = Form.useForm();

  // Editable fields state
  const [editingFullName, setEditingFullName] = useState(false);
  const [fullNameInput, setFullNameInput] = useState('');

  const [editingEmail, setEditingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState('');

  // Modals & Upload state
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
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
        setFullNameInput(res.user.fullName || '');
        setEmailInput(res.user.email || '');

        if (res.user.memberships && res.user.memberships.length > 0) {
          const firstOrg = res.user.memberships[0]?.organization;
          if (firstOrg) {
            setSelectedOrgId(firstOrg.id);
            try {
              const tasksRes = await orgService.getMyTasksInOrg(firstOrg.id);
              if (tasksRes.success && tasksRes.tasks) {
                setRecentTasks(tasksRes.tasks.slice(0, 5));
              }
            } catch (err) {
              console.error('Error fetching recent tasks:', err);
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Error fetching user profile:', err);
      message.error(err.message || 'Không thể tải thông tin hồ sơ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Fetch Team Data for selected org
  const fetchTeamData = useCallback(async (orgId: string) => {
    try {
      setLoadingTeam(true);
      const res = await orgService.getMembers(orgId);
      if (res.success) {
        setMembers(res.members || []);
        setInvitations(res.invitations || []);
      }
    } catch (err: any) {
      console.error('Error fetching team members:', err);
      message.error(err.message || 'Không thể tải danh sách thành viên.');
    } finally {
      setLoadingTeam(false);
    }
  }, [message]);

  // Fetch All Users for People tab
  const fetchAllUsersData = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const res = await userService.getAllUsers();
      if (res.success) {
        setAllUsers(res.users || []);
      }
    } catch (err: any) {
      console.error('Error fetching platform users:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'team' && selectedOrgId) {
      fetchTeamData(selectedOrgId);
    } else if (activeTab === 'people') {
      fetchAllUsersData();
    }
  }, [activeTab, selectedOrgId, fetchTeamData, fetchAllUsersData]);

  // Current user's role in selected org
  const currentUserRole = useMemo(() => {
    if (!user || !selectedOrgId) return 'MEMBER';
    const m = user.memberships.find((mem) => mem.organization.id === selectedOrgId);
    return m?.role || 'MEMBER';
  }, [user, selectedOrgId]);

  const isAdminOrOwner = currentUserRole === 'ADMIN' || currentUserRole === 'OWNER';

  // Cloudinary File Upload for Avatar
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUpdatingAvatar(true);
      message.loading({ content: 'Đang tải ảnh lên Cloudinary...', key: 'uploadAvatar' });
      const res = await userService.uploadAvatar(file);
      if (res.success && res.user) {
        setUser((prev) => (prev ? { ...prev, avatarUrl: res.user.avatarUrl } : null));
        message.success({ content: 'Đã tải ảnh đại diện lên Cloudinary thành công!', key: 'uploadAvatar' });
      }
    } catch (err: any) {
      message.error({ content: err.message || 'Tải ảnh lên thất bại.', key: 'uploadAvatar' });
    } finally {
      setUpdatingAvatar(false);
      if (e.target) e.target.value = '';
    }
  };

  // Reset Avatar to Initials
  const handleResetAvatarToInitials = async () => {
    try {
      setUpdatingAvatar(true);
      const res = await userService.updateMe({ avatarUrl: '' });
      if (res.success) {
        setUser((prev) => (prev ? { ...prev, avatarUrl: null } : null));
        message.success('Đã tạo hình đại diện có tên viết tắt.');
      }
    } catch (err: any) {
      message.error(err.message || 'Không thể tạo hình đại diện.');
    } finally {
      setUpdatingAvatar(false);
    }
  };

  const avatarMenuItems: MenuProps['items'] = [
    {
      key: 'upload-file',
      icon: <UploadOutlined />,
      label: 'Tải ảnh hồ sơ lên',
      onClick: () => avatarFileInputRef.current?.click(),
    },
    {
      key: 'reset-initials',
      icon: <UserOutlined />,
      label: 'Tạo hình đại diện có tên viết tắt',
      onClick: handleResetAvatarToInitials,
    },
  ];

  // Save Full Name
  const handleSaveFullName = async () => {
    setEditingFullName(false);
    if (!fullNameInput.trim() || fullNameInput === user?.fullName) {
      setFullNameInput(user?.fullName || '');
      return;
    }

    try {
      const res = await userService.updateMe({ fullName: fullNameInput.trim() });
      if (res.success) {
        setUser((prev) => (prev ? { ...prev, fullName: res.user.fullName } : null));
        message.success('Đã cập nhật họ và tên.');
      }
    } catch (err: any) {
      setFullNameInput(user?.fullName || '');
      message.error(err.message || 'Không thể cập nhật tên.');
    }
  };

  // Save Email
  const handleSaveEmail = async () => {
    setEditingEmail(false);
    if (!emailInput.trim() || emailInput === user?.email) {
      setEmailInput(user?.email || '');
      return;
    }

    try {
      const res = await userService.updateMe({ email: emailInput.trim() });
      if (res.success) {
        setUser((prev) => (prev ? { ...prev, email: res.user.email } : null));
        message.success('Đã cập nhật email.');
      }
    } catch (err: any) {
      setEmailInput(user?.email || '');
      message.error(err.message || 'Không thể cập nhật email.');
    }
  };

  // Save Avatar URL
  const handleSaveAvatar = async () => {
    try {
      setUpdatingAvatar(true);
      const res = await userService.updateMe({ avatarUrl: avatarUrlInput.trim() });
      if (res.success) {
        setUser((prev) => (prev ? { ...prev, avatarUrl: res.user.avatarUrl } : null));
        message.success('Đã cập nhật ảnh đại diện.');
        setAvatarModalOpen(false);
      }
    } catch (err: any) {
      message.error(err.message || 'Không thể cập nhật ảnh đại diện.');
    } finally {
      setUpdatingAvatar(false);
    }
  };

  // Change Password Submit
  const handlePasswordSubmit = async (values: any) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('Xác nhận mật khẩu mới không khớp.');
      return;
    }

    try {
      setPasswordSubmitting(true);
      const res = await userService.changePassword(values.oldPassword, values.newPassword);
      if (res.success) {
        message.success('Đổi mật khẩu thành công!');
        setPasswordModalOpen(false);
        passwordForm.resetFields();
      }
    } catch (err: any) {
      message.error(err.message || 'Không thể đổi mật khẩu.');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  // Role Change
  const handleRoleChange = async (memberId: string, newRole: OrgRole) => {
    if (!selectedOrgId) return;
    try {
      await orgService.updateMemberRole(selectedOrgId, memberId, newRole);
      message.success('Đã cập nhật vai trò thành viên.');
      fetchTeamData(selectedOrgId);
    } catch (err: any) {
      message.error(err.message || 'Không thể cập nhật vai trò.');
    }
  };

  // Reactivate Member
  const handleReactivateMember = async (memberId: string) => {
    if (!selectedOrgId) return;
    try {
      await orgService.updateMemberStatus(selectedOrgId, memberId, 'ACTIVE');
      message.success('Đã kích hoạt lại thành viên.');
      fetchTeamData(selectedOrgId);
    } catch (err: any) {
      message.error(err.message || 'Không thể kích hoạt lại thành viên.');
    }
  };

  // Resend Invite
  const handleResendInvite = async (invitationId: string) => {
    if (!selectedOrgId) return;
    try {
      await orgService.resendInvitation(selectedOrgId, invitationId);
      message.success('Đã gửi lại lời mời thành công.');
    } catch (err: any) {
      message.error(err.message || 'Không thể gửi lại lời mời.');
    }
  };

  // Invite Submit
  const handleInviteSubmit = async (values: any) => {
    if (!selectedOrgId) return;
    try {
      setInviteSubmitting(true);
      await orgService.inviteMember(selectedOrgId, values.email.trim(), values.role);
      message.success('Đã gửi lời mời thành công!');
      setInviteModalOpen(false);
      inviteForm.resetFields();
      fetchTeamData(selectedOrgId);
    } catch (err: any) {
      message.error(err.message || 'Không thể gửi lời mời.');
    } finally {
      setInviteSubmitting(false);
    }
  };

  // Team Table Data
  const teamTableData: TeamRowItem[] = useMemo(() => {
    const memberRows: TeamRowItem[] = members.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.user?.fullName || m.user?.username || 'User',
      username: m.user?.username || '',
      email: m.user?.email || '',
      avatarUrl: m.user?.avatarUrl || null,
      role: m.role,
      status: m.status,
      joinedAt: m.joinedAt,
      isInvitation: false,
    }));

    const inviteRows: TeamRowItem[] = invitations.map((inv) => ({
      id: `inv-${inv.id}`,
      userId: `inv-${inv.id}`,
      name: inv.email.split('@')[0] || inv.email,
      username: inv.email,
      email: inv.email,
      avatarUrl: null,
      role: inv.invitedRole,
      status: 'INVITED',
      joinedAt: inv.createdAt,
      isInvitation: true,
      invitationId: inv.id,
    }));

    return [...memberRows, ...inviteRows];
  }, [members, invitations]);

  const teamColumns = [
    {
      title: 'THÀNH VIÊN',
      dataIndex: 'name',
      key: 'name',
      render: (_: any, record: TeamRowItem) => {
        const isSelf = authUser?.id === record.userId || user?.id === record.userId;
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
                <span className="font-bold text-gray-900 text-sm">{record.name}</span>
                {isSelf && (
                  <span className="text-[11px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
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
      title: 'VAI TRÒ',
      dataIndex: 'role',
      key: 'role',
      width: 180,
      render: (role: OrgRole, record: TeamRowItem) => {
        const isSelf = authUser?.id === record.userId || user?.id === record.userId;
        const canEditRole = isAdminOrOwner && !isSelf && !record.isInvitation && record.role !== 'OWNER';

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
      title: 'TRẠNG THÁI',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status: string) => <StatusBadge status={status} />,
    },
    {
      title: 'THAM GIA / HÀNH ĐỘNG',
      key: 'actions',
      width: 220,
      render: (_: any, record: TeamRowItem) => {
        if (record.status === 'ACTIVE') {
          return (
            <span className="text-xs text-gray-500 font-medium">
              {dayjs(record.joinedAt).format('DD/MM/YYYY')}
            </span>
          );
        }

        if (record.status === 'INVITED' && record.invitationId) {
          return isAdminOrOwner ? (
            <Button
              type="link"
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => handleResendInvite(record.invitationId!)}
              className="p-0 text-indigo-600 hover:text-indigo-700 font-semibold text-xs"
            >
              Gửi lại lời mời
            </Button>
          ) : (
            <span className="text-xs text-gray-400 italic">Đang chờ phản hồi</span>
          );
        }

        if (record.status === 'SUSPENDED') {
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
            <span className="text-xs text-gray-400 italic">Tài khoản bị khóa</span>
          );
        }

        return null;
      },
    },
  ];

  // Filtered Users for People tab
  const filteredUsers = useMemo(() => {
    if (!peopleSearch.trim()) return allUsers;
    const q = peopleSearch.toLowerCase();
    return allUsers.filter(
      (u) =>
        u.fullName?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
    );
  }, [allUsers, peopleSearch]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  const firstLetter = (user.fullName || user.username || 'U').charAt(0).toUpperCase();
  const avatarBgColor = getUserAvatarColor(user.id);

  return (
    <div className="min-h-screen bg-white text-left font-sans flex flex-col">
      {/* Hidden File Input for Avatar Cloudinary Upload */}
      <input
        type="file"
        ref={avatarFileInputRef}
        onChange={handleAvatarFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Top Header Bar */}
      <header className="bg-white border-b border-gray-200/80 px-6 py-3 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="font-brand text-xl font-bold text-indigo-600">
            TaskFlow
          </Link>
        </div>
      </header>

      {/* Main Container with Left Sub-Sidebar Menu */}
      <main className="flex-1 max-w-full w-full mx-auto p-2 md:p-3 flex flex-col md:flex-row gap-6 bg-white">
        {/* Left Sub-Sidebar Navigation */}
        <aside className="w-full md:w-64 flex flex-col gap-2 shrink-0 pr-2 border-r border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => router.push('/dashboard')}
              className="rounded-xl border-none shadow-none text-gray-600 hover:text-indigo-600 hover:border-indigo-300 text-xs font-semibold"
            >
              Quay lại Dashboard
            </Button>
          </div>

          <nav className="flex flex-col gap-1">
            {/* Item 1: Dành cho bạn */}
            <button
              onClick={() => setActiveTab('profile')}
              className={`relative flex items-center gap-3.5 px-4 py-1.5 rounded-xl text-sm font-semibold transition-all cursor-pointer text-left ${
                activeTab === 'profile'
                  ? 'bg-indigo-50/80 text-indigo-700 font-bold'
                  : 'bg-white text-gray-600 hover:bg-gray-100/70 hover:text-gray-900 font-medium'
              }`}
            >
              {activeTab === 'profile' && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-indigo-600 rounded-lg" />
              )}
              <UserOutlined className={`text-base ${activeTab === 'profile' ? 'text-indigo-600' : 'text-gray-500'}`} />
              <span>Dành cho bạn</span>
            </button>

            {/* Item 2: Đội ngũ */}
            <button
              onClick={() => setActiveTab('team')}
              className={`relative flex items-center gap-3.5 px-4 py-1.5 rounded-xl text-sm font-semibold transition-all cursor-pointer text-left ${
                activeTab === 'team'
                  ? 'bg-indigo-50/80 text-indigo-700 font-bold'
                  : 'bg-white text-gray-600 hover:bg-gray-100/70 hover:text-gray-900 font-medium'
              }`}
            >
              {activeTab === 'team' && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-indigo-600 rounded-lg" />
              )}
              <TeamOutlined className={`text-base ${activeTab === 'team' ? 'text-indigo-600' : 'text-gray-500'}`} />
              <span>Đội ngũ</span>
            </button>

            {/* Item 3: Mọi người */}
            <button
              onClick={() => setActiveTab('people')}
              className={`relative flex items-center gap-3.5 px-4 py-1.5 rounded-xl text-sm font-semibold transition-all cursor-pointer text-left ${
                activeTab === 'people'
                  ? 'bg-indigo-50/80 text-indigo-700 font-bold'
                  : 'bg-white text-gray-600 hover:bg-gray-100/70 hover:text-gray-900 font-medium'
              }`}
            >
              {activeTab === 'people' && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-indigo-600 rounded-lg" />
              )}
              <UserOutlined className={`text-base ${activeTab === 'people' ? 'text-indigo-600' : 'text-gray-500'}`} />
              <span>Mọi người</span>
            </button>
          </nav>
        </aside>

        {/* Right Main Content Area */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'profile' && (
            /* PROFILE TAB (JIRA STYLE WITH ATLASSIAN SVG BANNER) */
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col">
              {/* Cover Banner with Token Gradient */}
              <div className="h-44 md:h-52 bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-400 relative overflow-hidden flex items-start justify-end p-4 rounded-t-2xl">
                <Button
                  icon={<PictureOutlined />}
                  onClick={() => avatarFileInputRef.current?.click()}
                  className="relative z-10 bg-white/90 hover:!bg-white text-gray-700 border border-gray-200/80 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 px-3 py-1.5 cursor-pointer"
                >
                  Thêm ảnh bìa
                </Button>
              </div>

              {/* User Main Header */}
              <div className="px-6 md:px-10 pb-6 border-b border-gray-200/80 relative">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div className="flex items-end gap-5">
                    {/* Avatar with Dropdown Popup Menu */}
                    <Dropdown menu={{ items: avatarMenuItems }} trigger={['click']} placement="bottomLeft">
                      <div
                        className="relative -mt-16 w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-white shadow-lg overflow-hidden flex items-center justify-center text-white text-3xl md:text-4xl font-bold cursor-pointer group shrink-0"
                        style={{ backgroundColor: !user.avatarUrl ? avatarBgColor : undefined }}
                        title="Đổi ảnh hồ sơ"
                      >
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.fullName || user.username} className="w-full h-full object-cover" />
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
                            className="text-2xl md:text-3xl font-bold text-gray-900 m-0 cursor-pointer hover:text-indigo-600 transition-colors flex items-center gap-2 group"
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
                          className="cursor-pointer text-indigo-600 hover:underline flex items-center gap-1 font-medium"
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
                  <span className="text-sm font-semibold text-indigo-600 border-b-2 border-indigo-600 pb-2 cursor-pointer">
                    Tổng quan
                  </span>
                </div>
              </div>

              {/* 2-Column Body Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-6 md:p-10 bg-slate-50/50">
                <div className="lg:col-span-2 flex flex-col gap-6">
                  <div className="flex flex-col gap-3">
                    <h3 className="text-base font-bold text-gray-900 m-0">Làm việc với tôi</h3>
                    <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-sm text-sm text-gray-600 leading-relaxed italic hover:border-gray-300 transition-all cursor-pointer">
                      {user.fullName ? (
                        <span className="not-italic text-gray-800 font-medium">
                          Tôi là {user.fullName} (@{user.username}). Tôi ưu tiên cập nhật tiến độ công việc trên ứng dụng TaskFlow.
                        </span>
                      ) : (
                        <span>e.g. I prefer async updates in TaskFlow. For urgent questions, ping me between 9am-5pm.</span>
                      )}
                    </div>
                  </div>

                  {/* Recent Tasks Styled Like Dashboard Activity Timeline */}
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-gray-900 m-0 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
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
                                router.push(`/dashboard/${slug}/projects/${task.projectKey}`);
                              } else {
                                router.push('/dashboard');
                              }
                            }}
                          >
                            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0 mt-0.5">
                              <CheckSquareOutlined className="text-xs" />
                            </div>
                            <div className="flex flex-col flex-grow overflow-hidden">
                              <div className="text-sm text-gray-700 leading-snug">
                                <span className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                  {task.title}
                                </span>
                                <span className="text-xs text-gray-400 font-mono ml-2">
                                  [{task.displayCode || `#${task.taskNumber || 'TASK'}`}]
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600">
                                  {task.status}
                                </span>
                                <span>·</span>
                                <span>{dayjs(task.updatedAt || task.createdAt).fromNow()}</span>
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
                        <span className="text-xs font-semibold text-gray-400">Email</span>
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
                            className="font-medium text-gray-800 break-all cursor-pointer hover:text-indigo-600 transition-colors flex items-center justify-between group"
                            onClick={() => setEditingEmail(true)}
                          >
                            <span>{user.email || 'Chưa cập nhật'}</span>
                            <EditOutlined className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold text-gray-400">Tên đăng nhập</span>
                        <span className="font-mono font-medium text-gray-700">@{user.username}</span>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold text-gray-400">Đăng nhập gần nhất</span>
                        <span className="font-medium text-gray-700 flex items-center gap-1.5">
                          <ClockCircleOutlined className="text-gray-400 text-xs" />
                          {formatLastLogin(user.lastLoginAt)}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold text-gray-400">Trạng thái xác thực</span>
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
                          onClick={() => router.push(`/dashboard/${m.organization.slug}`)}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar shape="square" className="rounded-xl bg-indigo-100 text-indigo-600 font-bold text-sm shrink-0">
                              {m.organization.name.charAt(0).toUpperCase()}
                            </Avatar>
                            <div className="flex flex-col text-left">
                              <span className="font-semibold text-sm text-gray-900 group-hover:text-indigo-600 transition-colors">
                                {m.organization.name}
                              </span>
                              <span className="text-xs text-gray-400 font-mono">/{m.organization.slug}</span>
                            </div>
                          </div>

                          <RoleBadge role={m.role} />
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            /* TEAM TAB (MEMBERS MANAGEMENT) */
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col gap-6 text-left">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-900 m-0">Đội ngũ & Thành viên</h1>
                    {user.memberships.length > 1 && (
                      <Select
                        value={selectedOrgId}
                        onChange={(val) => setSelectedOrgId(val)}
                        className="w-48"
                        size="small"
                      >
                        {user.memberships.map((m) => (
                          <Select.Option key={m.organization.id} value={m.organization.id}>
                            {m.organization.name}
                          </Select.Option>
                        ))}
                      </Select>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-gray-400">
                    {teamTableData.length} thành viên · Vai trò của bạn: <RoleBadge role={currentUserRole} />
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
                    className="!bg-indigo-600 rounded-xl shadow-sm hover:!bg-indigo-700"
                  >
                    + Mời thành viên
                  </Button>
                )}
              </div>

              {/* Members Table */}
              <Table
                columns={teamColumns}
                dataSource={teamTableData}
                rowKey="id"
                loading={loadingTeam}
                pagination={false}
                rowClassName={(record) =>
                  record.status === 'SUSPENDED' ? 'opacity-60 bg-gray-50/50' : ''
                }
                className="rounded-xl overflow-hidden border border-gray-100 shadow-sm"
              />
            </div>
          )}

          {activeTab === 'people' && (
            /* PEOPLE TAB (ALL USERS VIEW) */
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col gap-6 text-left">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div className="flex flex-col gap-0.5">
                  <h1 className="text-2xl font-bold text-gray-900 m-0">Mọi người trong hệ thống</h1>
                  <span className="text-xs font-semibold text-gray-400">
                    {filteredUsers.length} người dùng đang hoạt động
                  </span>
                </div>

                <Input
                  prefix={<SearchOutlined className="text-gray-400" />}
                  placeholder="Tìm kiếm theo tên, username, email..."
                  value={peopleSearch}
                  onChange={(e) => setPeopleSearch(e.target.value)}
                  className="w-full md:w-72 rounded-xl"
                  allowClear
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    className="p-4 rounded-2xl border border-gray-200/80 bg-white hover:border-indigo-200 hover:shadow-sm transition-all flex items-start gap-3.5"
                  >
                    <Avatar
                      src={u.avatarUrl || undefined}
                      style={{ backgroundColor: getUserAvatarColor(u.id) }}
                      className="font-bold shrink-0"
                      size={44}
                    >
                      {(u.fullName || u.username || 'U').charAt(0).toUpperCase()}
                    </Avatar>

                    <div className="flex flex-col text-left overflow-hidden flex-1">
                      <span className="font-bold text-gray-900 text-sm truncate">{u.fullName || u.username}</span>
                      <span className="text-xs text-gray-400 font-mono">@{u.username}</span>
                      {u.email && <span className="text-xs text-gray-500 mt-1 truncate">{u.email}</span>}

                      {u.memberships && u.memberships.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {u.memberships.slice(0, 2).map((m) => (
                            <span
                              key={m.organization.id}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100"
                            >
                              {m.organization.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

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
            className="!bg-indigo-600 font-semibold"
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
        <Form form={passwordForm} layout="vertical" onFinish={handlePasswordSubmit} className="mt-4 text-left">
          <Form.Item
            name="oldPassword"
            label="Mật khẩu hiện tại"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại' }]}
          >
            <Input.Password placeholder="Nhập mật khẩu hiện tại..." />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="Mật khẩu mới"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu mới' },
              { min: 6, message: 'Mật khẩu phải từ 6 ký tự trở lên' },
            ]}
          >
            <Input.Password placeholder="Nhập mật khẩu mới..." />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Xác nhận mật khẩu mới"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Vui lòng xác nhận mật khẩu mới' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Nhập lại mật khẩu mới..." />
          </Form.Item>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
            <Button onClick={() => setPasswordModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={passwordSubmitting} className="!bg-indigo-600">
              Lưu mật khẩu
            </Button>
          </div>
        </Form>
      </Modal>

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
          initialValues={{ role: 'MEMBER' }}
          className="mt-4 text-left"
        >
          <Form.Item
            name="email"
            label="Địa chỉ Email người nhận"
            rules={[
              { required: true, message: 'Vui lòng nhập địa chỉ Email' },
              { type: 'email', message: 'Địa chỉ Email không hợp lệ' },
            ]}
          >
            <Input prefix={<MailOutlined className="text-gray-400" />} placeholder="username@example.com" />
          </Form.Item>

          <Form.Item
            name="role"
            label="Vai trò cấp quyền"
            rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
          >
            <Select>
              <Select.Option value="ADMIN">ADMIN - Quản trị viên (Xem, sửa, quản lý dự án & thành viên)</Select.Option>
              <Select.Option value="MEMBER">MEMBER - Thành viên (Tạo task, xem dự án)</Select.Option>
              <Select.Option value="GUEST">GUEST - Khách (Chỉ xem nội dung)</Select.Option>
            </Select>
          </Form.Item>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
            <Button onClick={() => setInviteModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={inviteSubmitting} className="!bg-indigo-600">
              Gửi lời mời
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
