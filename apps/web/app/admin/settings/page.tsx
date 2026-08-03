"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Skeleton,
  Switch,
} from "antd";
import {
  getAdminSettings,
  updateAdminSetting,
  type PlatformSettings,
} from "../../../services/admin";
import { usePlatformSettings } from "../../../contexts/PlatformSettingsContext";

export default function AdminSettingsPage() {
  const { message } = App.useApp();
  const { settings, reloadSettings } = usePlatformSettings();
  const [form] = Form.useForm<PlatformSettings>();
  const [original, setOriginal] = useState<PlatformSettings | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const announcementEnabled = Form.useWatch("announcement_enabled", form);
  const maintenanceMode = Form.useWatch("maintenance_mode", form);

  useEffect(() => {
    const controller = new AbortController();

    void getAdminSettings(controller.signal)
      .then((response) => {
        setOriginal(response.settings);
        setCanManage(response.canManage);
        form.setFieldsValue(response.settings);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.error("Failed to load platform settings:", error);
        message.error("Không thể tải cấu hình nền tảng.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [form, message]);

  const handleSave = async () => {
    if (!original || !canManage) return;

    const values = await form.validateFields();
    const keys = Object.keys(values) as Array<keyof PlatformSettings>;
    const changedKeys = keys.filter(
      (key) => JSON.stringify(values[key]) !== JSON.stringify(original[key]),
    );

    if (changedKeys.length === 0) {
      message.info("Không có thay đổi cần lưu.");
      return;
    }

    try {
      setSaving(true);
      await Promise.all(
        changedKeys.map((key) => updateAdminSetting(key, values[key])),
      );
      await reloadSettings();
      setOriginal(values);
      message.success("Đã lưu cấu hình nền tảng.");
    } catch (error) {
      console.error("Failed to update platform settings:", error);
      message.error("Không thể lưu cấu hình.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Skeleton active paragraph={{ rows: 10 }} />;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="text-left">
        <h1 className="text-2xl font-semibold text-gray-900">
          Cấu hình nền tảng
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Quản lý thông tin, hành vi mặc định và giới hạn chung của{" "}
          {settings.platform_name}.
        </p>
      </header>

      {!canManage ? (
        <Alert
          type="info"
          showIcon
          message="Bạn chỉ có quyền xem cấu hình này."
        />
      ) : null}

      <Form form={form} layout="vertical" disabled={!canManage}>
        <div className="flex flex-col gap-6">
          <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Chung</h2>
              <p className="mt-1 text-sm text-gray-500">
                Thông tin và hành vi mặc định của nền tảng.
              </p>
            </div>

            <div className="grid gap-x-6 md:grid-cols-2">
              <Form.Item
                name="platform_name"
                label="Tên nền tảng"
                rules={[
                  { required: true, message: "Vui lòng nhập tên nền tảng." },
                  { min: 2, max: 100, message: "Tên phải có từ 2 đến 100 ký tự." },
                ]}
              >
                <Input className="h-11" />
              </Form.Item>

              <Form.Item
                name="support_email"
                label="Email hỗ trợ"
                rules={[{ type: "email", message: "Email không hợp lệ." }]}
              >
                <Input type="email" className="h-11" />
              </Form.Item>

              <Form.Item
                name="default_language"
                label="Ngôn ngữ mặc định"
                rules={[{ required: true }]}
              >
                <Select
                  className="h-11"
                  options={[{ value: "vi", label: "Tiếng Việt" }]}
                />
              </Form.Item>

              <Form.Item
                name="default_timezone"
                label="Múi giờ mặc định"
                rules={[{ required: true }]}
              >
                <Select
                  className="h-11"
                  options={[
                    { value: "Asia/Bangkok", label: "GMT+7 — Việt Nam" },
                  ]}
                />
              </Form.Item>

              <Form.Item
                name="date_format"
                label="Định dạng ngày"
                rules={[{ required: true }]}
              >
                <Select
                  className="h-11"
                  options={[
                    { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
                    { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
                  ]}
                />
              </Form.Item>

              <Form.Item
                name="default_project_view"
                label="Màn hình dự án mặc định"
                rules={[{ required: true }]}
              >
                <Select
                  className="h-11"
                  options={[
                    { value: "summary", label: "Tổng quan" },
                    { value: "board", label: "Bảng Kanban" },
                    { value: "list", label: "Danh sách" },
                    { value: "timeline", label: "Mốc thời gian" },
                  ]}
                />
              </Form.Item>
            </div>

            <div className="grid gap-x-6 md:grid-cols-2">
              <Form.Item
                name="registration_enabled"
                label="Cho phép đăng ký tài khoản"
                valuePropName="checked"
                extra="User mới có thể tự tạo tài khoản TaskFlow."
              >
                <Switch />
              </Form.Item>

              <Form.Item
                name="organization_creation_enabled"
                label="Cho phép tạo tổ chức"
                valuePropName="checked"
                extra="User có thể tạo organization mới."
              >
                <Switch />
              </Form.Item>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <Form.Item
                name="announcement_enabled"
                label="Thông báo toàn hệ thống"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              {announcementEnabled ? (
                <Form.Item
                  name="announcement_message"
                  label="Nội dung thông báo"
                  rules={[
                    {
                      required: true,
                      whitespace: true,
                      message: "Vui lòng nhập nội dung thông báo.",
                    },
                    { max: 500, message: "Tối đa 500 ký tự." },
                  ]}
                >
                  <Input.TextArea rows={3} maxLength={500} showCount />
                </Form.Item>
              ) : null}
            </div>
          </Card>

          <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Giới hạn và vận hành
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Các giới hạn đang được hệ thống lưu ở cấp nền tảng.
              </p>
            </div>

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
                message="Chế độ bảo trì đang bật trong cấu hình nền tảng."
              />
            ) : null}
          </Card>

          {canManage ? (
            <div className="flex justify-end">
              <Button
                type="primary"
                loading={saving}
                onClick={() => void handleSave()}
                className="h-11 rounded-xl border-none bg-blue-600 px-6 font-semibold text-white shadow-md transition-colors duration-150 ease-out hover:bg-blue-700 motion-reduce:transition-none"
              >
                Lưu cấu hình
              </Button>
            </div>
          ) : null}
        </div>
      </Form>
    </div>
  );
}
