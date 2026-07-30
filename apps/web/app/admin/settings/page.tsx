"use client";

import React, { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Form,
  InputNumber,
  Select,
  Skeleton,
  Switch,
} from "antd";
import {
  getAdminSettings,
  PlatformSettings,
  updateAdminSetting,
} from "../../../services/admin";

export default function AdminSettingsPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm<PlatformSettings>();
  const [original, setOriginal] = useState<PlatformSettings | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const maintenanceMode = Form.useWatch("maintenance_mode", form);

  useEffect(() => {
    void getAdminSettings()
      .then((response) => {
        setOriginal(response.settings);
        setCanManage(response.canManage);
        form.setFieldsValue(response.settings);
      })
      .catch((err) => {
        console.error("Failed to load platform settings:", err);
        message.error("Không thể tải cấu hình nền tảng.");
      })
      .finally(() => setLoading(false));
  }, [form, message]);

  const handleSave = async () => {
    if (!original || !canManage) return;
    const values = await form.validateFields();
    const keys = Object.keys(values) as Array<keyof PlatformSettings>;
    const changed = keys.filter(
      (key) => JSON.stringify(values[key]) !== JSON.stringify(original[key]),
    );
    if (!changed.length) {
      message.info("Không có thay đổi cần lưu.");
      return;
    }
    try {
      setSaving(true);
      await Promise.all(
        changed.map((key) => updateAdminSetting(key, values[key])),
      );
      setOriginal(values);
      message.success("Đã lưu cấu hình nền tảng.");
    } catch (err) {
      console.error("Failed to update platform settings:", err);
      message.error("Không thể lưu cấu hình.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Skeleton active paragraph={{ rows: 8 }} />;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="text-left">
        <h1 className="text-2xl font-semibold text-gray-900">
          Cấu hình nền tảng
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Quản lý các giới hạn và hành vi dùng chung của TaskFlow.
        </p>
      </header>

      {!canManage ? (
        <Alert
          type="info"
          showIcon
          message="Bạn chỉ có quyền xem cấu hình này."
        />
      ) : null}

      <Card className="rounded-2xl border border-gray-200/80 bg-white shadow-sm">
        <Form form={form} layout="vertical" disabled={!canManage}>
          <div className="grid gap-x-6 md:grid-cols-2">
            <Form.Item
              name="invitation_expiry_days"
              label="Thời hạn lời mời (ngày)"
              rules={[{ required: true, type: "number", min: 1 }]}
            >
              <InputNumber min={1} precision={0} className="h-11 w-full" />
            </Form.Item>
            <Form.Item
              name="max_upload_size_mb"
              label="Dung lượng upload tối đa (MB)"
              rules={[{ required: true, type: "number", min: 1 }]}
            >
              <InputNumber min={1} precision={0} className="h-11 w-full" />
            </Form.Item>
          </div>

          <Form.Item
            name="allowed_file_types"
            label="Loại file được phép"
            rules={[{ required: true, type: "array", min: 1 }]}
          >
            <Select
              mode="tags"
              tokenSeparators={[","]}
              placeholder="Ví dụ: image/png"
              className="min-h-11"
            />
          </Form.Item>

          <Form.Item
            name="maintenance_mode"
            label="Chế độ bảo trì"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          {maintenanceMode ? (
            <Alert
              type="warning"
              showIcon
              message="Toàn bộ người dùng thường sẽ không truy cập được hệ thống"
              className="mb-6"
            />
          ) : null}

          {canManage ? (
            <div className="flex justify-end border-t border-gray-100 pt-6">
              <Button
                type="primary"
                loading={saving}
                onClick={() => void handleSave()}
                className="h-11 rounded-xl border-none bg-blue-600 px-6 font-semibold text-white shadow-md hover:bg-blue-700"
              >
                Lưu cấu hình
              </Button>
            </div>
          ) : null}
        </Form>
      </Card>
    </div>
  );
}
