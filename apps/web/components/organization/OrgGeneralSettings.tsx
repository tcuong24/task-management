"use client";

import React, { useState } from "react";
import { Card, Button, Modal, Form, Input, message } from "antd";
import { EditOutlined, SaveOutlined } from "@ant-design/icons";
import { Organization, updateOrganization } from "../../services/organization";
import { useOrgPermissions } from "../../hooks/useOrgPermissions";

interface OrgGeneralSettingsProps {
  organization: Organization;
  onUpdate: (updated: Organization) => void;
}

export default function OrgGeneralSettings({
  organization,
  onUpdate,
}: OrgGeneralSettingsProps) {
  const { canViewSettings } = useOrgPermissions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleEditClick = () => {
    form.setFieldsValue({
      name: organization.name,
      slug: organization.slug,
    });
    setIsModalOpen(true);
  };

  const handleFinish = async (values: { name: string; slug: string }) => {
    try {
      setSaving(true);
      const res = await updateOrganization(
        organization.id,
        values.name,
        values.slug,
      );
      if (res.success) {
        message.success("Cập nhật thông tin tổ chức thành công.");
        onUpdate(res.organization);
        setIsModalOpen(false);
      }
    } catch (err: any) {
      if (err.status === 403) {
        message.error("Bạn không có quyền thực hiện hành động này.");
      } else {
        message.error(err.message || "Lỗi khi cập nhật tổ chức.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      title={
        <span className="font-extrabold text-gray-800 text-base">
          Thông tin chung
        </span>
      }
      className="border-none shadow-md rounded-2xl bg-white text-left"
      extra={
        canViewSettings && (
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={handleEditClick}
            className="text-gray-500 hover:text-gray-700 transition-colors flex items-center font-semibold text-sm border-none bg-transparent"
          >
            Chỉnh sửa
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 bg-gray-50 text-gray-700 rounded-2xl flex items-center justify-center font-semibold text-2xl uppercase border border-gray-100/50">
            {organization.name.charAt(0)}
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-lg font-bold text-gray-800">
              {organization.name}
            </span>
            <span className="text-sm text-gray-400 font-medium">
              Slug: /{organization.slug}
            </span>
          </div>
        </div>
      </div>

      <Modal
        title={
          <span className="font-extrabold text-gray-800 text-lg">
            Chỉnh sửa thông tin tổ chức
          </span>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        centered
        width={440}
        className="org-edit-modal"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          requiredMark={false}
          className="mt-4"
        >
          <Form.Item
            label={
              <span className="text-gray-700 text-sm font-semibold">
                Tên tổ chức
              </span>
            }
            name="name"
            rules={[
              { required: true, message: "Tên tổ chức không được để trống." },
            ]}
          >
            <Input size="large" className="rounded-xl border-gray-200" />
          </Form.Item>

          <Form.Item
            label={
              <span className="text-gray-700 text-sm font-semibold">Slug</span>
            }
            name="slug"
            rules={[{ required: true, message: "Slug không được để trống." }]}
          >
            <Input
              size="large"
              addonBefore="taskflow.vn/org/"
              className="rounded-xl border-gray-200 overflow-hidden"
            />
          </Form.Item>

          <div className="flex items-center gap-3 mt-6">
            <Button
              disabled={saving}
              onClick={() => setIsModalOpen(false)}
              className="flex-1 rounded-xl h-10 text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center justify-center"
            >
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              icon={<SaveOutlined />}
              className="flex-1 rounded-xl h-10 text-sm font-bold bg-blue-600 hover:bg-blue-700 border-none text-white shadow-md flex items-center justify-center"
            >
              Lưu cấu hình
            </Button>
          </div>
        </Form>
      </Modal>
    </Card>
  );
}
