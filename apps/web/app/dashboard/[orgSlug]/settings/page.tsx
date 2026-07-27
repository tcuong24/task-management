'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useOrg } from '../../../../contexts/OrgContext';
import * as orgService from '../../../../services/organization';
import OrgGeneralSettings from '../../../../components/organization/OrgGeneralSettings';
import MembersTable from '../../../../components/organization/MembersTable';
import InviteMemberModal from '../../../../components/organization/InviteMemberModal';
import { Card, Button, Skeleton, Alert } from 'antd';
import { PlusOutlined, SettingOutlined } from '@ant-design/icons';

export default function OrgSettingsPage() {
  const router = useRouter();
  const { currentOrg, userRole, refreshOrganizations } = useOrg();
  const orgId = currentOrg?.id;

  const [org, setOrg] = useState<orgService.Organization | null>(null);
  const [members, setMembers] = useState<orgService.OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const isAdminOrOwner = userRole === 'ADMIN' || userRole === 'OWNER';

  const fetchData = async () => {
    if (!orgId) return;
    try {
      setLoading(true);
      setError(null);

      // Fetch org details
      const orgRes = await orgService.getOrganization(orgId);
      if (orgRes.success) {
        setOrg(orgRes.organization);
      }

      // Fetch members
      try {
        const membersRes = await orgService.getMembers(orgId);
        if (membersRes.success) {
          setMembers(membersRes.members);
        }
      } catch (err) {
        // Forbidden skipped
      }
    } catch (err: any) {
      console.error('Error fetching organization details:', err);
      if (err.status === 403) {
        setError('Bạn không có quyền xem thông tin cài đặt của tổ chức này.');
      } else if (err.status === 404) {
        setError('Không tìm thấy tổ chức yêu cầu.');
      } else {
        setError(err.message || 'Lỗi kết nối máy chủ.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [orgId]);

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="w-full max-w-4xl space-y-4">
          <Skeleton active avatar paragraph={{ rows: 6 }} />
        </div>
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="p-8 max-w-3xl mx-auto text-left">
        <Alert
          message="Truy cập bị từ chối"
          description={error || 'Không tìm thấy thông tin tổ chức.'}
          type="error"
          showIcon
          className="rounded-2xl shadow-sm border border-red-100 mb-4"
        />
        <Button onClick={() => router.push(`/dashboard`)}>
          Quay lại Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-4 flex flex-col gap-6  mx-auto w-full text-left">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2.5">
            <SettingOutlined className="text-indigo-600" />
            <span>Cài đặt Tổ chức: {org.name}</span>
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-0.5">
            Cấu hình thông tin chung và phân quyền thành viên tổ chức.
          </p>
        </div>

        {isAdminOrOwner && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setInviteModalOpen(true)}
            className="bg-indigo-600 border-none font-semibold text-white shadow-sm hover:bg-indigo-700 rounded-xl h-[42px] px-5"
          >
            Mời thành viên
          </Button>
        )}
      </div>

      {/* Main Content Layout */}
      <div className="flex flex-col gap-8">
        {/* Section 1: General Info */}
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-gray-800">Thông tin chung</h2>
          <Card className="border border-gray-100 shadow-sm rounded-2xl bg-white">
            <OrgGeneralSettings
              organization={org}
              onUpdate={() => {
                fetchData();
                refreshOrganizations();
              }}
            />
          </Card>
        </section>

        {/* Section 2: Members List (Admin/Owner only) */}
        {isAdminOrOwner && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">Thành viên tổ chức</h2>
            </div>
            <MembersTable
              organizationId={org.id}
              members={members}
              loading={loading}
              onRefresh={fetchData}
            />
          </section>
        )}
      </div>

      {/* Invite Member Modal */}
      <InviteMemberModal
        organizationId={org.id}
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
