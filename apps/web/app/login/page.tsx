'use client';

import React, { useState, Suspense } from 'react';
import { Form, Input, Button, Checkbox, Alert, ConfigProvider, App } from 'antd';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { useSearchParams } from 'next/navigation';

function LoginForm() {
  const { message } = App.useApp();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const expired = searchParams.get('expired');

  React.useEffect(() => {
    if (expired === 'true') {
      message.error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
      
      // Clean up URL so it doesn't show again on refresh
      const url = new URL(window.location.href);
      url.searchParams.delete('expired');
      window.history.replaceState({}, '', url);
    }
  }, [expired]);

  const onFinish = async (values: any) => {
    try {
      setLoading(true);
      setServerError(null);
      await login(values.username, values.password, values.rememberMe, redirect);
    } catch (err: any) {
      setServerError(err.message || 'Tài khoản hoặc mật khẩu không chính xác.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          borderRadius: 16,
          colorPrimary: '#4f46e5', // Indigo-600
          colorBorder: '#e5e7eb', // Gray-200
        },
        components: {
          Input: {
            controlHeightLG: 50,
            colorPrimary: '#6366f1',
            colorPrimaryHover: '#818cf8',
            colorText: '#1f2937',
            colorTextPlaceholder: '#9ca3af',
          },
          Button: {
            controlHeightLG: 52,
            colorPrimary: '#09090b', // Black
            colorPrimaryHover: '#18181b', // Off-black
            colorPrimaryActive: '#000000',
          },
          Checkbox: {
            colorPrimary: '#09090b',
          }
        }
      }}
    >
      <div className="relative flex min-h-[100dvh] w-full items-center justify-center bg-gradient-to-t from-[#b4bfe4] via-[#ebb6d3] to-[#FFF] px-4 py-12 select-none overflow-hidden">
        {/* Background Perspective Tunnel Wireframe */}
        <PerspectiveLines />

        <div className="relative z-10 w-full max-w-[420px] flex flex-col items-center">
          {/* Header branding */}
          <div className="mb-2 inline-flex items-center justify-center bg-[#FEF08A] text-gray-900 text-[13px] font-semibold px-4 py-1 rounded-sm shadow-sm font-brand">
            TaskFlow Login
          </div>
          <h1 className="font-brand text-4xl font-extrabold tracking-tight text-gray-900 mt-2 mb-8">
            Welcome TaskFlow!
          </h1>

          {/* Login Card */}
          <div className="w-full bg-white/60 backdrop-blur-md rounded-[24px] border border-white/60 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.03)]">
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
                label={<span className="text-gray-700 text-sm font-semibold font-sans">Tên đăng nhập</span>}
                name="username"
                rules={[
                  { required: true, message: 'Vui lòng nhập tên đăng nhập.' },
                  { pattern: /^[a-zA-Z0-9_]{3,30}$/, message: 'Tên đăng nhập không đúng định dạng.' }
                ]}
                className="mb-4"
              >
                <Input
                  size="large"
                  placeholder="Nhập tên đăng nhập"
                  className="rounded-2xl border-gray-200 text-gray-800 font-medium"
                />
              </Form.Item>

              {/* Password Input */}
              <Form.Item
                label={<span className="text-gray-700 text-sm font-semibold font-sans">Mật khẩu</span>}
                name="password"
                rules={[
                  { required: true, message: 'Vui lòng nhập mật khẩu.' },
                  { min: 8, message: 'Mật khẩu phải dài tối thiểu 8 ký tự.' },
                ]}
                className="mb-5"
              >
                <Input.Password
                  size="large"
                  placeholder="Nhập mật khẩu"
                  className="rounded-2xl border-gray-200 text-gray-800 font-medium"
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
                  className="text-sm font-semibold text-gray-900 hover:text-indigo-600 transition-colors"
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
                  className="w-full font-bold text-white transition-all active:scale-[0.98] rounded-2xl shadow-sm border-none"
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
                className="w-full flex items-center justify-center border border-gray-200 hover:border-gray-300 rounded-2xl h-[52px] bg-white text-gray-700 font-semibold shadow-sm hover:shadow transition-all active:scale-[0.98]"
                onClick={() => message.info('Tính năng đăng nhập bằng Google đang được bảo trì.')}
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
    </ConfigProvider>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[100dvh] w-full items-center justify-center bg-gray-50">
        Loading...
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

// Background perspective wireframe lines
const PerspectiveLines = () => {
  const cx = 50;
  const cy = 50;
  const rx = 16;
  const ry = 28;
  const scales = [1, 1.5, 2.2, 3];

  const outerPoints = [
    // Top edge
    ...Array.from({ length: 11 }, (_, i) => ({ x: i * 10, y: 0 })),
    // Bottom edge
    ...Array.from({ length: 11 }, (_, i) => ({ x: i * 10, y: 100 })),
    // Left edge (excluding corners)
    ...Array.from({ length: 9 }, (_, i) => ({ x: 0, y: (i + 1) * 10 })),
    // Right edge (excluding corners)
    ...Array.from({ length: 9 }, (_, i) => ({ x: 100, y: (i + 1) * 10 })),
  ];

  const getInnerPoint = (px: number, py: number) => {
    const dx = px - cx;
    const dy = py - cy;
    const tx = dx === 0 ? Infinity : rx / Math.abs(dx);
    const ty = dy === 0 ? Infinity : ry / Math.abs(dy);
    const t = Math.min(tx, ty);
    return {
      x: cx + t * dx,
      y: cy + t * dy,
    };
  };

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none select-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {/* Concentric Rectangles */}
      {scales.map((s, idx) => {
        const width = 2 * s * rx;
        const height = 2 * s * ry;
        const x = cx - s * rx;
        const y = cy - s * ry;
        return (
          <rect
            key={idx}
            x={x}
            y={y}
            width={width}
            height={height}
            fill="none"
            stroke="rgba(99, 102, 241, 0.04)"
            strokeWidth="0.15"
          />
        );
      })}

      {/* Radiating Rays */}
      {outerPoints.map((pt, idx) => {
        const inner = getInnerPoint(pt.x, pt.y);
        return (
          <line
            key={idx}
            x1={inner.x}
            y1={inner.y}
            x2={pt.x}
            y2={pt.y}
            stroke="rgba(99, 102, 241, 0.035)"
            strokeWidth="0.12"
          />
        );
      })}
    </svg>
  );
};

