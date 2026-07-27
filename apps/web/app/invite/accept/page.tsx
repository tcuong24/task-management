'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, Tag, Button, Alert, Spin, App, ConfigProvider } from 'antd';
import { MailOutlined, SafetyOutlined, CloseCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../../../hooks/useAuth';
import * as invitationService from '../../../services/invitation';

const ROLE_COLORS: Record<string, string> = {
  OWNER: 'gold',
  ADMIN: 'blue',
  MEMBER: 'default',
  GUEST: 'cyan',
};

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Chủ sở hữu',
  ADMIN: 'Quản trị viên',
  MEMBER: 'Thành viên',
  GUEST: 'Khách',
};

function InviteAcceptForm() {
  const { message } = App.useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { user, loading: authLoading, logout } = useAuth();

  const [invitation, setInvitation] = useState<invitationService.OrganizationInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorState, setErrorState] = useState<{ type: 'EXPIRED' | 'ACCEPTED' | 'DECLINED' | 'INVALID' | 'UNKNOWN'; message: string } | null>(null);

  useEffect(() => {
    if (!token) {
      setErrorState({ type: 'INVALID', message: 'Lời mời không hợp lệ hoặc thiếu mã xác nhận.' });
      setLoading(false);
      return;
    }

    const fetchInvitation = async () => {
      try {
        setLoading(true);
        const res = await invitationService.getInvitation(token);
        if (res.success) {
          const invite = res.invitation;
          setInvitation(invite);

          // Kiểm tra trạng thái lời mời từ DB
          if (invite.status === 'EXPIRED') {
            setErrorState({ type: 'EXPIRED', message: 'Lời mời đã hết hạn, vui lòng liên hệ người mời để gửi lại.' });
          } else if (invite.status === 'ACCEPTED') {
            setErrorState({ type: 'ACCEPTED', message: 'Lời mời này đã được chấp nhận trước đó.' });
          } else if (invite.status === 'DECLINED') {
            setErrorState({ type: 'DECLINED', message: 'Bạn đã từ chối lời mời này.' });
          } else if (invite.status === 'REVOKED') {
            setErrorState({ type: 'INVALID', message: 'Lời mời này đã bị thu hồi.' });
          }
        }
      } catch (err: any) {
        console.error('Error fetching invitation:', err);
        if (err.status === 404) {
          setErrorState({ type: 'INVALID', message: 'Lời mời không tồn tại hoặc không hợp lệ.' });
        } else if (err.errorCode === 'INVITATION_EXPIRED') {
          setErrorState({ type: 'EXPIRED', message: 'Lời mời đã hết hạn, vui lòng liên hệ người mời để gửi lại.' });
        } else {
          setErrorState({ type: 'UNKNOWN', message: err.message || 'Có lỗi xảy ra khi tải thông tin lời mời.' });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    try {
      setActionLoading(true);
      const res = await invitationService.acceptInvitation(token);
      if (res.success) {
        message.success('Chấp nhận lời mời thành công!');
        const targetOrgSlug = res.member.organization?.slug || res.member.organizationId;
        router.push(`/dashboard/${targetOrgSlug}`);
      }
    } catch (err: any) {
      message.error(err.message || 'Chấp nhận lời mời thất bại.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!token) return;
    try {
      setActionLoading(true);
      const res = await invitationService.declineInvitation(token);
      if (res.success) {
        message.success('Đã từ chối lời mời.');
        router.push('/dashboard');
      }
    } catch (err: any) {
      message.error(err.message || 'Từ chối lời mời thất bại.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSwitchAccount = async () => {
    try {
      setActionLoading(true);
      await logout();
      router.push(`/login?redirect=/invite/accept?token=${token}`);
    } catch (err) {
      message.error('Đăng xuất thất bại.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Spin size="large" />
        <span className="mt-4 text-gray-500 font-medium">Đang tải thông tin lời mời...</span>
      </div>
    );
  }

  // 1. Trạng thái lỗi (hết hạn, không tồn tại, đã dùng)
  if (errorState) {
    return (
      <Card className="w-full max-w-[480px] p-8 rounded-2xl shadow-xl border border-gray-100/50 bg-white">
        <div className="text-center">
          <CloseCircleOutlined className="text-red-500 text-5xl mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Không thể tham gia tổ chức</h2>
          <p className="text-sm text-gray-500 mb-6">{errorState.message}</p>
          <Button
            type="primary"
            onClick={() => router.push('/dashboard')}
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md border-none font-bold active:scale-[0.98] transition-all"
          >
            Quay về Dashboard
          </Button>
        </div>
      </Card>
    );
  }

  if (!invitation) return null;

  const isEmailMismatch = user && user.email && user.email !== invitation.email;

  return (
    <Card className="w-full max-w-[480px] p-8 rounded-2xl shadow-xl border border-gray-100/50 bg-white">
      <div className="flex flex-col items-center text-center">
        {/* Branding header icon */}
        <div className="mb-4 w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center">
          <MailOutlined className="text-indigo-600 text-xl" />
        </div>

        <span className="text-xs uppercase font-bold tracking-widest text-indigo-500 mb-1">
          Lời mời tham gia
        </span>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
          {invitation.organization.name}
        </h1>

        <p className="text-sm text-gray-500 mb-6">
          Bạn được mời bởi <span className="font-semibold text-gray-800">{invitation.invitedBy.fullName}</span> với vai trò:{' '}
          <Tag color={ROLE_COLORS[invitation.invitedRole] || 'default'} className="rounded-md font-semibold text-xs ml-1">
            {ROLE_LABELS[invitation.invitedRole] || invitation.invitedRole}
          </Tag>
        </p>

        {/* 2. Trường hợp chưa đăng nhập */}
        {!user ? (
          <div className="w-full space-y-3">
            <Alert
              message="Yêu cầu đăng nhập"
              description="Vui lòng đăng nhập hoặc tạo tài khoản để chấp nhận lời mời này."
              type="info"
              showIcon
              className="rounded-xl mb-4 text-left"
            />
            <Button
              type="primary"
              onClick={() => router.push(`/login?redirect=/invite/accept?token=${token}`)}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md border-none font-bold active:scale-[0.98] transition-all"
            >
              Đăng nhập tài khoản
            </Button>
            <Button
              onClick={() => router.push(`/register?redirect=/invite/accept?token=${token}`)}
              className="w-full h-11 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl transition-all font-semibold"
            >
              Đăng ký tài khoản mới
            </Button>
          </div>
        ) : isEmailMismatch ? (
          /* 3. Trường hợp sai email tài khoản */
          <div className="w-full space-y-4">
            <Alert
              message="Tài khoản không trùng khớp"
              description={
                <div className="text-xs">
                  <p>Lời mời này được gửi đến: <strong className="text-gray-900">{invitation.email}</strong></p>
                  <p className="mt-1">Tài khoản hiện tại của bạn: <strong className="text-gray-900">{user.email || 'chưa cập nhật'}</strong></p>
                </div>
              }
              type="warning"
              showIcon
              className="rounded-xl text-left"
            />
            <Button
              danger
              onClick={handleSwitchAccount}
              loading={actionLoading}
              className="w-full h-11 rounded-xl font-bold active:scale-[0.98] transition-all"
            >
              Đăng xuất & Đăng nhập email khác
            </Button>
            <Button
              onClick={() => router.push('/dashboard')}
              className="w-full h-11 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl transition-all font-semibold"
            >
              Bỏ qua và quay về Dashboard
            </Button>
          </div>
        ) : (
          /* 4. Đúng tài khoản đang đăng nhập */
          <div className="w-full space-y-3">
            <Button
              type="primary"
              onClick={handleAccept}
              loading={actionLoading}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md border-none font-bold active:scale-[0.98] transition-all"
            >
              Chấp nhận tham gia
            </Button>
            <Button
              onClick={handleDecline}
              loading={actionLoading}
              className="w-full h-11 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl transition-all font-semibold"
            >
              Từ chối lời mời
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

export default function InviteAcceptPage() {
  return (
    <ConfigProvider
      theme={{
        token: {
          borderRadius: 16,
          colorPrimary: '#4f46e5', // Indigo-600
        },
      }}
    >
      <div className="flex min-h-[100dvh] w-full items-center justify-center bg-gray-50 px-4 py-12">
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center">
            <Spin size="large" />
            <span className="mt-4 text-gray-500">Đang khởi tạo màn hình...</span>
          </div>
        }>
          <InviteAcceptForm />
        </Suspense>
      </div>
    </ConfigProvider>
  );
}
