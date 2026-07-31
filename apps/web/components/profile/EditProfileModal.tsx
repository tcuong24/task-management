"use client";

import React, { useEffect, useState } from "react";
import { Modal, Form, Input, App } from "antd";
import type { UserProfileDetail } from "../../services/user";
import * as userService from "../../services/user";

interface EditProfileModalProps {
  open: boolean;
  user: UserProfileDetail | null;
  onClose: () => void;
  onSuccess: (updatedUser: UserProfileDetail) => void;
}

export function EditProfileModal({
  open,
  user,
  onClose,
  onSuccess,
}: EditProfileModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user && open) {
      form.setFieldsValue({
        fullName: user.fullName || "",
        email: user.email || "",
      });
    }
  }, [user, open, form]);

  const handleSubmit = async (values: any) => {
    try {
      setSubmitting(true);
      const res = await userService.updateMe({
        fullName: values.fullName?.trim(),
        email: values.email?.trim(),
      });
      if (res.success && res.user) {
        message.success(res.message || "Cập nhật thông tin thành công!");
        onSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      message.error(err.message || "Không thể cập nhật thông tin.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        <span className="text-lg font-bold text-gray-900">
          Chỉnh sửa thông tin cá nhân
        </span>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={440}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="mt-4 space-y-4 text-left"
      >
        <Form.Item
          name="fullName"
          label={
            <span className="text-xs font-medium text-gray-700">Họ và tên</span>
          }
          rules={[{ required: true, message: "Vui lòng nhập họ và tên" }]}
        >
          <Input className="h-11 rounded-xl border-gray-200 text-sm focus:border-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" />
        </Form.Item>

        <Form.Item
          name="email"
          label={
            <span className="text-xs font-medium text-gray-700">Địa chỉ Email</span>
          }
          rules={[
            { required: true, message: "Vui lòng nhập địa chỉ email" },
            { type: "email", message: "Email không hợp lệ" },
          ]}
        >
          <Input className="h-11 rounded-xl border-gray-200 text-sm focus:border-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" />
        </Form.Item>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium text-sm rounded-xl min-h-[44px] transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl  transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {submitting ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </Form>
    </Modal>
  );
}
