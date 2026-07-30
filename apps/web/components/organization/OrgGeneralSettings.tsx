"use client";

import React, { useEffect, useState } from "react";
import { App, Avatar, Button, Form, Input } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import {
  Organization,
  updateOrganization,
} from "../../services/organization";

interface OrgGeneralSettingsProps {
  organization: Organization;
  canEdit: boolean;
  onUpdate: (updated: Organization) => void;
}

interface OrganizationFormValues {
  name: string;
  slug: string;
}

export default function OrgGeneralSettings({
  organization,
  canEdit,
  onUpdate,
}: OrgGeneralSettingsProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<OrganizationFormValues>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    form.setFieldsValue({
      name: organization.name,
      slug: organization.slug,
    });
  }, [form, organization]);

  const handleFinish = async (values: OrganizationFormValues) => {
    try {
      setSaving(true);
      const response = await updateOrganization(
        organization.id,
        values.name.trim(),
        values.slug.trim(),
      );

      onUpdate(response.organization);
      message.success("Đã cập nhật thông tin tổ chức.");
    } catch (err: any) {
      if (err.status === 403) {
        message.error("Bạn không có quyền cập nhật tổ chức này.");
      } else {
        message.error(err.message || "Không thể cập nhật thông tin tổ chức.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)]">
      <div className="flex flex-col items-center gap-3 rounded-xl bg-gray-50/50 p-4 text-center">
        <Avatar
          src={organization.avatarUrl || undefined}
          size={72}
          className="border border-gray-200 bg-gray-100 text-xl font-semibold text-gray-700"
        >
          {organization.name.charAt(0).toUpperCase()}
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">
            {organization.name}
          </p>
          <p className="mt-1 text-xs text-gray-500">Ảnh đại diện tổ chức</p>
        </div>
      </div>

      <Form<OrganizationFormValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={handleFinish}
        disabled={!canEdit}
        className="min-w-0"
      >
        <Form.Item
          label={
            <span className="text-sm font-semibold text-gray-700">
              Tên tổ chức
            </span>
          }
          name="name"
          rules={[
            { required: true, whitespace: true, message: "Nhập tên tổ chức." },
            { max: 255, message: "Tên tổ chức tối đa 255 ký tự." },
          ]}
        >
          <Input
            size="large"
            autoComplete="organization"
            placeholder="Ví dụ: Acme Studio"
            className="rounded-xl border-gray-200"
          />
        </Form.Item>

        <Form.Item
          label={
            <span className="text-sm font-semibold text-gray-700">
              Đường dẫn tổ chức
            </span>
          }
          extra={
            <span className="text-xs text-gray-500">
              Slug chỉ gồm chữ thường, số và dấu gạch ngang.
            </span>
          }
          name="slug"
          normalize={(value: string) =>
            value?.toLowerCase().replace(/\s+/g, "-")
          }
          rules={[
            { required: true, whitespace: true, message: "Nhập slug tổ chức." },
            {
              pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
              message: "Slug không đúng định dạng.",
            },
            { max: 255, message: "Slug tối đa 255 ký tự." },
          ]}
        >
          <Input
            size="large"
            addonBefore="/dashboard/"
            placeholder="acme-studio"
            className="overflow-hidden rounded-xl border-gray-200"
          />
        </Form.Item>

        {canEdit ? (
          <div className="flex justify-end border-t border-gray-100 pt-4">
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              icon={<SaveOutlined />}
              className="h-11 rounded-xl border-none bg-blue-600 px-5 font-semibold text-white shadow-md transition-colors duration-150 ease-out hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 motion-reduce:transition-none"
            >
              Lưu thay đổi
            </Button>
          </div>
        ) : (
          <p className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500">
            Bạn chỉ có quyền xem cài đặt này.
          </p>
        )}
      </Form>
    </div>
  );
}
