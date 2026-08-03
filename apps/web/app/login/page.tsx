"use client";

import React, { useState, Suspense } from "react";
import { Form, Input, Button, Checkbox, Alert, App } from "antd";
import Link from "next/link";
import { useAuth } from "../../hooks/useAuth";
import { useSearchParams } from "next/navigation";
import { usePlatformSettings } from "../../contexts/PlatformSettingsContext";

function LoginForm() {
  const { message } = App.useApp();
  const { login } = useAuth();
  const { settings } = usePlatformSettings();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";
  const expired = searchParams.get("expired");

  React.useEffect(() => {
    if (expired === "true") {
      message.error("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");

      // Clean up URL so it doesn't show again on refresh
      const url = new URL(window.location.href);
      url.searchParams.delete("expired");
      window.history.replaceState({}, "", url);
    }
  }, [expired]);

  const onFinish = async (values: any) => {
    try {
      setLoading(true);
      setServerError(null);
      await login(
        values.username,
        values.password,
        values.rememberMe,
        redirect,
      );
    } catch (err: any) {
      setServerError(err.message || "Tài khoản hoặc mật khẩu không chính xác.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-[420px] flex flex-col items-center">
        {/* Header branding */}
        <div className="mb-2 inline-flex items-center justify-center bg-gray-100 text-gray-700 text-xs font-semibold px-4 py-1 rounded-md font-brand">
          {settings.platform_name} Login
        </div>
        <h1 className="font-brand text-4xl font-extrabold tracking-tight text-gray-900 mt-2 mb-8">
          Welcome {settings.platform_name}!
        </h1>

        {/* Login Card */}
        <div className="w-full bg-white rounded-2xl p-6 md:p-8 shadow-xl">
          {/* Server Error Alert */}
          {serverError && (
            <Alert
              message={serverError}
              type="error"
              showIcon
              className="mb-5 border-red-100 bg-red-50 text-red-700 rounded-xl text-sm font-medium"
            />
          )}

          <Form
            name="login_form"
            initialValues={{ rememberMe: false }}
            onFinish={onFinish}
            layout="vertical"
            requiredMark={false}
          >
            {/* Username Input */}
            <Form.Item
              label={
                <span className="text-gray-700 text-sm font-semibold font-sans">
                  Tên đăng nhập
                </span>
              }
              name="username"
              rules={[
                { required: true, message: "Vui lòng nhập tên đăng nhập." },
                {
                  pattern: /^[a-zA-Z0-9_]{3,30}$/,
                  message: "Tên đăng nhập không đúng định dạng.",
                },
              ]}
              className="mb-4"
            >
              <Input
                size="large"
                placeholder="Nhập tên đăng nhập"
                className="rounded-xl border-gray-200 text-gray-800 font-medium focus-ring"
              />
            </Form.Item>

            {/* Password Input */}
            <Form.Item
              label={
                <span className="text-gray-700 text-sm font-semibold font-sans">
                  Mật khẩu
                </span>
              }
              name="password"
              rules={[
                { required: true, message: "Vui lòng nhập mật khẩu." },
                { min: 8, message: "Mật khẩu phải dài tối thiểu 8 ký tự." },
              ]}
              className="mb-5"
            >
              <Input.Password
                size="large"
                placeholder="Nhập mật khẩu"
                className="rounded-xl border-gray-200 text-gray-800 font-medium focus-ring"
              />
            </Form.Item>

            {/* Remember Me and Forgot Password */}
            <div className="flex items-center justify-between mb-6">
              <Form.Item name="rememberMe" valuePropName="checked" noStyle>
                <Checkbox className="text-gray-500 text-sm hover:text-gray-600 font-medium">
                  Ghi nhớ đăng nhập
                </Checkbox>
              </Form.Item>
              <Link
                href="/forgot-password"
                className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-150 ease-out focus-ring"
              >
                Quên mật khẩu?
              </Link>
            </div>

            {/* Submit Button */}
            <Form.Item className="mb-4">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                className="w-full min-h-11 action-primary font-bold border-none focus-ring motion-reduce:transform-none"
              >
                Đăng nhập
              </Button>
            </Form.Item>

            {/* Divider or */}
            <div className="relative flex items-center justify-center my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100"></div>
              </div>
              <span className="relative px-3 bg-transparent text-gray-400 text-sm font-medium">
                or
              </span>
            </div>

            {/* Google Sign-in Mockup */}
            <Button
              size="large"
              className="w-full min-h-11 action-secondary flex items-center justify-center font-semibold focus-ring"
              onClick={() =>
                message.info(
                  "Tính năng đăng nhập bằng Google đang được bảo trì.",
                )
              }
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582l3.51-3.51C17.827 1.145 15.06 0 12 0 7.24 0 3.14 2.724 1.127 6.677l4.139 3.088z"
                />
                <path
                  fill="#4285F4"
                  d="M23.49 12.275c0-.825-.075-1.62-.21-2.385H12v4.515h6.48a5.54 5.54 0 0 1-2.4 3.63v3.015h3.87c2.265-2.085 3.54-5.16 3.54-8.775z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.266 14.235A7.09 7.09 0 0 1 4.909 12c0-.795.135-1.56.357-2.265L1.127 6.65A11.96 11.96 0 0 0 0 12c0 1.92.45 3.735 1.252 5.378l4.014-3.143z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.97-1.08 7.965-2.91l-3.87-3.015c-1.08.72-2.46 1.155-4.095 1.155-3.15 0-5.823-2.13-6.777-5.003l-4.14 3.203C3.128 21.264 7.228 24 12 24z"
                />
              </svg>
              Tiếp tục với Google
            </Button>
          </Form>
        </div>

        {/* Small Footer Text */}
        <p className="mt-8 text-center text-xs text-gray-400 font-medium">
          Chưa có tài khoản? Vui lòng liên hệ với Quản trị viên để được cấp.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] w-full items-center justify-center bg-gray-50">
          Loading...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
