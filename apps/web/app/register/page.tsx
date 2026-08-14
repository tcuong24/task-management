"use client";

import { Suspense, useState, type ReactNode } from "react";
import { Alert, Button, Form, Input, Spin } from "antd";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { usePlatformSettings } from "../../contexts/PlatformSettingsContext";
import { register } from "../../services/auth";

interface RegisterFormValues {
  fullName: string;
  username: string;
  email?: string;
  password: string;
  confirmPassword: string;
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings, loading: settingsLoading } = usePlatformSettings();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const redirect = searchParams.get("redirect");
  const safeRedirect =
    redirect?.startsWith("/") && !redirect.startsWith("//") ? redirect : null;

  const handleSubmit = async (values: RegisterFormValues) => {
    try {
      setSubmitting(true);
      setServerError(null);
      await register({
        fullName: values.fullName.trim(),
        username: values.username.trim(),
        email: values.email?.trim() || undefined,
        password: values.password,
      });

      const loginParams = new URLSearchParams({ registered: "true" });
      if (safeRedirect) loginParams.set("redirect", safeRedirect);
      router.replace(`/login?${loginParams.toString()}`);
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "Không thể tạo tài khoản. Vui lòng thử lại.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (settingsLoading) {
    return (
      <AuthPageShell platformName={settings.platform_name}>
        <div
          className="flex min-h-40 flex-col items-center justify-center gap-3 text-center text-sm text-gray-500"
          role="status"
          aria-live="polite"
        >
          <Spin size="large" />
          <span>Đang kiểm tra cấu hình đăng ký…</span>
        </div>
      </AuthPageShell>
    );
  }

  if (!settings.registration_enabled) {
    return (
      <AuthPageShell platformName={settings.platform_name}>
        <Alert
          type="warning"
          showIcon
          message="Đăng ký tài khoản đang tạm dừng"
          description="Vui lòng liên hệ quản trị viên nếu bạn cần được cấp tài khoản."
          className="mb-6 rounded-xl"
        />
        <Link
          href="/login"
          className="flex min-h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 font-semibold text-gray-700 transition-colors duration-150 ease-out hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Quay lại đăng nhập
        </Link>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell platformName={settings.platform_name}>
      {serverError && (
        <Alert
          message={serverError}
          type="error"
          showIcon
          className="mb-5 rounded-xl border-red-100 bg-red-50 text-sm font-medium text-red-700"
        />
      )}

      <Form<RegisterFormValues>
        name="register_form"
        layout="vertical"
        requiredMark={false}
        onFinish={handleSubmit}
        disabled={submitting}
      >
        <Form.Item
          label={<span className="text-sm font-semibold text-gray-700">Họ và tên</span>}
          name="fullName"
          rules={[
            { required: true, whitespace: true, message: "Vui lòng nhập họ và tên." },
            { max: 255, message: "Họ và tên không được vượt quá 255 ký tự." },
          ]}
          className="mb-4"
        >
          <Input size="large" autoComplete="name" placeholder="Nguyễn Văn An" className="rounded-xl border-gray-200" />
        </Form.Item>

        <Form.Item
          label={<span className="text-sm font-semibold text-gray-700">Tên đăng nhập</span>}
          name="username"
          extra="Dùng 3–30 ký tự: chữ cái, chữ số hoặc dấu gạch dưới."
          rules={[
            { required: true, message: "Vui lòng nhập tên đăng nhập." },
            { pattern: /^[a-zA-Z0-9_]{3,30}$/, message: "Tên đăng nhập không đúng định dạng." },
          ]}
          className="mb-4"
        >
          <Input
            size="large"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="nguyenvanan"
            className="rounded-xl border-gray-200"
          />
        </Form.Item>

        <Form.Item
          label={<span className="text-sm font-semibold text-gray-700">Email <span className="font-normal text-gray-400">(không bắt buộc)</span></span>}
          name="email"
          rules={[{ type: "email", message: "Email không đúng định dạng." }]}
          className="mb-4"
        >
          <Input size="large" type="email" autoComplete="email" placeholder="ban@example.com" className="rounded-xl border-gray-200" />
        </Form.Item>

        <Form.Item
          label={<span className="text-sm font-semibold text-gray-700">Mật khẩu</span>}
          name="password"
          rules={[
            { required: true, message: "Vui lòng nhập mật khẩu." },
            { min: 8, message: "Mật khẩu phải có ít nhất 8 ký tự." },
          ]}
          className="mb-4"
        >
          <Input.Password size="large" autoComplete="new-password" placeholder="Tối thiểu 8 ký tự" className="rounded-xl border-gray-200" />
        </Form.Item>

        <Form.Item
          label={<span className="text-sm font-semibold text-gray-700">Xác nhận mật khẩu</span>}
          name="confirmPassword"
          dependencies={["password"]}
          rules={[
            { required: true, message: "Vui lòng nhập lại mật khẩu." },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("password") === value) return Promise.resolve();
                return Promise.reject(new Error("Mật khẩu xác nhận không khớp."));
              },
            }),
          ]}
          className="mb-6"
        >
          <Input.Password size="large" autoComplete="new-password" placeholder="Nhập lại mật khẩu" className="rounded-xl border-gray-200" />
        </Form.Item>

        <Form.Item className="mb-0">
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            size="large"
            className="action-primary min-h-11 w-full border-none font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 motion-reduce:transform-none"
          >
            Tạo tài khoản
          </Button>
        </Form.Item>
      </Form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Đã có tài khoản?{" "}
        <Link
          href={safeRedirect ? `/login?redirect=${encodeURIComponent(safeRedirect)}` : "/login"}
          className="font-semibold text-blue-600 transition-colors duration-150 ease-out hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Đăng nhập
        </Link>
      </p>
    </AuthPageShell>
  );
}

function AuthPageShell({ platformName, children }: { platformName: string; children: ReactNode }) {
  return (
    <main className="flex min-h-[100dvh] w-full items-center justify-center bg-gray-50 px-4 py-12">
      <div className="flex w-full max-w-[480px] flex-col items-center">
        <div className="rounded-md bg-gray-100 px-4 py-1 text-xs font-semibold text-gray-700">{platformName}</div>
        <h1 className="mb-2 mt-3 text-center font-brand text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">Tạo tài khoản</h1>
        <p className="mb-8 text-center text-sm text-gray-500">Bắt đầu quản lý công việc cùng đội nhóm của bạn.</p>
        <section className="w-full rounded-2xl bg-white p-6 shadow-xl md:p-8" aria-label="Đăng ký tài khoản">
          {children}
        </section>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[100dvh] items-center justify-center bg-gray-50 text-sm text-gray-500">Đang tải biểu mẫu đăng ký…</div>}>
      <RegisterForm />
    </Suspense>
  );
}
