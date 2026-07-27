'use client';

import React from 'react';
import { Card, Button, Typography } from 'antd';
import { LeftOutlined, HourglassOutlined } from '@ant-design/icons';
import Link from 'next/link';

const { Title, Paragraph } = Typography;

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4">
      <Card className="w-full max-w-[400px] border-none shadow-2xl rounded-2xl bg-white text-center" styles={{ body: { padding: '40px 32px' } }}>
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 border border-blue-100">
          <HourglassOutlined className="text-3xl text-blue-500 animate-spin" style={{ animationDuration: '6s' }} />
        </div>
        
        <Title level={3} className="text-gray-800 m-0 font-extrabold tracking-tight">
          Quên mật khẩu
        </Title>
        <Paragraph className="text-gray-400 mt-2 mb-8 text-sm">
          Tính năng này đang được phát triển. Vui lòng liên hệ với Quản trị viên của bạn để được hỗ trợ cấp lại thông tin đăng nhập.
        </Paragraph>

        <Link href="/login" passHref legacyBehavior>
          <Button
            type="default"
            icon={<LeftOutlined />}
            size="large"
            className="w-full border-gray-300 hover:border-gray-400 text-gray-600 hover:text-gray-800 transition-all rounded-xl active:scale-[0.98] flex items-center justify-center"
          >
            Quay lại đăng nhập
          </Button>
        </Link>
      </Card>
    </div>
  );
}
