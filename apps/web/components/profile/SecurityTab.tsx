"use client";

import React, { useState } from "react";
import { Form, Input, App } from "antd";
import { LockOutlined } from "@ant-design/icons";
import * as userService from "../../services/user";

export function SecurityTab() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const handlePasswordSubmit = async (values: any) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error("Mật khẩu xác nhận không khớp!");
      return;
    }

    try {
      setSubmitting(true);
      const res = await userService.changePassword(
        values.oldPassword,
        values.newPassword,
      );
      if (res.success) {
        message.success(res.message || "Đổi mật khẩu thành công!");
        form.resetFields();
      }
    } catch (err: any) {
      message.error(err.message || "Không thể đổi mật khẩu.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Change Password Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
          <LockOutlined className="text-blue-600 text-xl" />
          <h2 className="text-lg font-bold text-gray-900 m-0">
            Đổi mật khẩu
          </h2>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handlePasswordSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left"
        >
          <Form.Item
            name="oldPassword"
            label={
              <span className="text-xs font-medium text-gray-700">
                Mật khẩu hiện tại
              </span>
            }
            className="md:col-span-2 mb-2"
            rules={[{ required: true, message: "Vui lòng nhập mật khẩu hiện tại" }]}
          >
            <Input.Password
              placeholder="••••••••"
              className="w-full rounded-xl border-gray-200 h-11 text-sm focus:border-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label={
              <span className="text-xs font-medium text-gray-700">
                Mật khẩu mới
              </span>
            }
            className="mb-2"
            rules={[
              { required: true, message: "Vui lòng nhập mật khẩu mới" },
              { min: 6, message: "Mật khẩu phải từ 6 ký tự trở lên" },
            ]}
          >
            <Input.Password
              placeholder="••••••••"
              className="w-full rounded-xl border-gray-200 h-11 text-sm focus:border-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label={
              <span className="text-xs font-medium text-gray-700">
                Xác nhận mật khẩu mới
              </span>
            }
            className="mb-2"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "Vui lòng xác nhận mật khẩu mới" },
            ]}
          >
            <Input.Password
              placeholder="••••••••"
              className="w-full rounded-xl border-gray-200 h-11 text-sm focus:border-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            />
          </Form.Item>

          <div className="md:col-span-2 pt-3">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-medium text-sm rounded-xl transition-colors duration-150 ease-out  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 motion-reduce:transition-none cursor-pointer"
            >
              {submitting ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}
