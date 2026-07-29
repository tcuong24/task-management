"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spin, Button, Modal, Form, Input, message, Card } from "antd";
import { PlusOutlined, BankOutlined, RocketOutlined } from "@ant-design/icons";
import { useOrg } from "../../contexts/OrgContext";

export default function DashboardRootPage() {
  const { currentOrg, organizations, loading, createNewOrg } = useOrg();
  const router = useRouter();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (loading) return;

    if (currentOrg) {
      router.replace(`/dashboard/${currentOrg.slug || currentOrg.id}`);
    } else if (organizations.length > 0 && organizations[0]) {
      router.replace(
        `/dashboard/${organizations[0].slug || organizations[0].id}`,
      );
    }
  }, [currentOrg, organizations, loading, router]);

  const handleCreateFinish = async (values: { name: string; slug: string }) => {
    try {
      setSubmitting(true);
      const newOrg = await createNewOrg(values.name, values.slug);
      message.success("Tạo tổ chức thành công!");
      setCreateModalOpen(false);
      form.resetFields();
      if (newOrg) {
        router.replace(`/dashboard/${newOrg.slug || newOrg.id}`);
      }
    } catch (err: any) {
      message.error(err.message || "Tạo tổ chức thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] gap-3">
        <Spin size="large" />
        <span className="text-sm font-medium text-gray-500">
          Đang tải thông tin tổ chức...
        </span>
      </div>
    );
  }

  // If user belongs to 0 organizations, display Empty State
  if (organizations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center">
        <Card className="max-w-lg w-full border border-gray-100 shadow-sm rounded-3xl p-6 md:p-8 bg-white text-center">
          <div className="w-16 h-16 bg-gray-50 text-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100 shadow-sm">
            <BankOutlined className="text-3xl" />
          </div>

          <h2 className="text-2xl font-semibold text-gray-900 tracking-tight mb-2">
            Bạn chưa tham gia tổ chức nào
          </h2>

          <p className="text-sm text-gray-500 leading-relaxed mb-6">
            Để bắt đầu quản lý công việc và theo dõi dự án trên TaskFlow, hãy
            tạo một tổ chức mới hoặc nhờ Quản trị viên gửi lời mời tham gia.
          </p>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalOpen(true)}
            className="!bg-blue-600 hover:!bg-blue-700 !border-none font-semibold text-white shadow-md rounded-xl h-[44px] px-6 w-full sm:w-auto"
          >
            Tạo tổ chức mới
          </Button>
        </Card>

        {/* Modal Tạo tổ chức mới */}
        <Modal
          title={
            <div className="flex items-center gap-2 text-gray-800 text-lg font-bold">
              <RocketOutlined className="text-gray-700" />
              <span>Tạo tổ chức mới</span>
            </div>
          }
          open={createModalOpen}
          onCancel={() => {
            setCreateModalOpen(false);
            form.resetFields();
          }}
          footer={null}
          centered
          width={440}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreateFinish}
            className="mt-4 text-left"
          >
            <Form.Item
              name="name"
              label={
                <span className="font-semibold text-gray-700">Tên tổ chức</span>
              }
              rules={[
                { required: true, message: "Vui lòng nhập tên tổ chức." },
              ]}
            >
              <Input
                placeholder="VD: Acme Corporation, Software Team..."
                onChange={(e) => {
                  const val = e.target.value;
                  const generatedSlug = val
                    .toLowerCase()
                    .trim()
                    .replace(/[^a-z0-9\s-]/g, "")
                    .replace(/\s+/g, "-");
                  form.setFieldsValue({ slug: generatedSlug });
                }}
              />
            </Form.Item>

            <Form.Item
              name="slug"
              label={
                <span className="font-semibold text-gray-700">
                  Slug (Đường dẫn định danh)
                </span>
              }
              rules={[{ required: true, message: "Vui lòng nhập slug." }]}
            >
              <Input placeholder="acme-corp" />
            </Form.Item>

            <div className="flex justify-end gap-2 mt-6">
              <Button onClick={() => setCreateModalOpen(false)}>Hủy</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                className="!bg-blue-600 hover:!bg-blue-700"
              >
                Tạo mới
              </Button>
            </div>
          </Form>
        </Modal>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] gap-3">
      <Spin size="large" />
      <span className="text-sm font-medium text-gray-500">
        Đang chuyển hướng đến trang Tổ chức...
      </span>
    </div>
  );
}
