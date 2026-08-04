"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Alert, App, Button, Card, Skeleton } from "antd";
import {
  ClockCircleOutlined,
  DeleteOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useOrg } from "../../../../contexts/OrgContext";
import * as orgService from "../../../../services/organization";
import OrgGeneralSettings from "../../../../components/organization/OrgGeneralSettings";

function formatDate(value?: string) {
  if (!value) return "Chưa có dữ liệu";

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function OrgSettingsPage() {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const { currentOrg, userRole, refreshOrganizations } = useOrg();
  const orgId = currentOrg?.id;

  const [organization, setOrganization] =
    useState<orgService.Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canEdit = userRole === "ADMIN" || userRole === "OWNER";
  const canDelete = userRole === "OWNER";

  const handleDelete = () => {
    if (!organization) return;

    modal.confirm({
      title: "Xóa tổ chức?",
      content: `Tổ chức “${organization.name}” sẽ bị xóa và không còn hiển thị với các thành viên.`,
      okText: "Xóa tổ chức",
      okType: "danger",
      cancelText: "Hủy",
      centered: true,
      async onOk() {
        try {
          await orgService.deleteOrganization(organization.id);
          await refreshOrganizations();
          message.success("Đã xóa tổ chức.");
          router.replace("/dashboard");
        } catch (err: any) {
          if (err.status === 403) {
            message.error("Chỉ chủ sở hữu mới có thể xóa tổ chức.");
          } else {
            message.error(err.message || "Không thể xóa tổ chức.");
          }
          throw err;
        }
      },
    });
  };

  const fetchOrganization = useCallback(async () => {
    if (!orgId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await orgService.getOrganization(orgId);
      setOrganization(response.organization);
    } catch (err: any) {
      console.error("Error fetching organization settings:", err);

      if (err.status === 403) {
        setError("Bạn không có quyền xem cài đặt của tổ chức này.");
      } else if (err.status === 404) {
        setError("Không tìm thấy tổ chức.");
      } else {
        setError(err.message || "Không thể tải cài đặt tổ chức.");
      }
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void fetchOrganization();
  }, [fetchOrganization]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl p-4 md:p-6">
        <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <Skeleton active avatar paragraph={{ rows: 6 }} />
        </Card>
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
        <Alert
          message="Không thể mở cài đặt"
          description={error || "Không tìm thấy thông tin tổ chức."}
          type="error"
          showIcon
          className="mb-4 rounded-2xl border border-red-100"
        />
        <Button
          onClick={() => router.push("/dashboard")}
          className="h-11 rounded-xl border border-gray-200 bg-white px-5 font-semibold text-gray-700 transition-colors duration-150 ease-out hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 motion-reduce:transition-none"
        >
          Quay lại Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full  flex-col gap-6 p-2 md:p-3">


      <section aria-labelledby="general-settings-title">
        <Card
          className="rounded-2xl border border-gray-100 bg-white shadow-sm"
          styles={{ body: { padding: 0 } }}
        >
          <div className="border-b border-gray-100 p-6">
            <h2
              id="general-settings-title"
              className="text-lg font-semibold text-gray-900"
            >
              Thông tin chung
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-500">
              Tên và slug được sử dụng trên toàn bộ không gian làm việc.
            </p>
          </div>

          <div className="p-6">
            <OrgGeneralSettings
              organization={organization}
              canEdit={canEdit}
              onUpdate={(updated) => {
                setOrganization(updated);
                void refreshOrganizations();
              }}
            />
          </div>
        </Card>
      </section>

      <section aria-labelledby="system-information-title">
        <Card
          className="rounded-2xl border border-gray-100 bg-white shadow-sm"
          styles={{ body: { padding: 0 } }}
        >
          <div className="border-b border-gray-100 p-6">
            <h2
              id="system-information-title"
              className="text-lg font-semibold text-gray-900"
            >
              Thông tin hệ thống
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-500">
              Các thông tin định danh chỉ đọc của tổ chức.
            </p>
          </div>

          <dl className="divide-y divide-gray-100 px-6">
            <div className="grid gap-2 py-4 sm:grid-cols-[180px_1fr] sm:items-center">
              <dt className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <SafetyCertificateOutlined
                  className="text-gray-400"
                  aria-hidden="true"
                />
                Mã tổ chức
              </dt>
              <dd className="break-all rounded-md border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-500">
                {organization.id}
              </dd>
            </div>

            <div className="grid gap-2 py-4 sm:grid-cols-[180px_1fr] sm:items-center">
              <dt className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <ClockCircleOutlined
                  className="text-gray-400"
                  aria-hidden="true"
                />
                Ngày tạo
              </dt>
              <dd className="text-sm text-gray-700">
                {formatDate(organization.createdAt)}
              </dd>
            </div>

            <div className="grid gap-2 py-4 sm:grid-cols-[180px_1fr] sm:items-center">
              <dt className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <ClockCircleOutlined
                  className="text-gray-400"
                  aria-hidden="true"
                />
                Cập nhật gần nhất
              </dt>
              <dd className="text-sm text-gray-700">
                {formatDate(organization.updatedAt)}
              </dd>
            </div>
          </dl>
        </Card>
      </section>

      {canDelete && (
        <section aria-labelledby="danger-zone-title">
          <Card
            className="rounded-2xl border border-red-200 bg-white shadow-sm"
            styles={{ body: { padding: 0 } }}
          >
            <div className="border-b border-red-100 p-6">
              <h2 id="danger-zone-title" className="text-lg font-semibold text-red-700">
                Khu vực nguy hiểm
              </h2>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                Xóa tổ chức sẽ khiến tổ chức không còn hiển thị với tất cả thành viên.
              </p>
            </div>
            <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-gray-900">Xóa tổ chức</p>
                <p className="mt-1 text-sm text-gray-500">Hành động này chỉ dành cho chủ sở hữu.</p>
              </div>
              <Button danger icon={<DeleteOutlined />} onClick={handleDelete} className="h-11 rounded-xl px-5 font-semibold">
                Xóa tổ chức
              </Button>
            </div>
          </Card>
        </section>
      )}
    </div>
  );
}
