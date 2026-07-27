'use client';

import React, { useState } from 'react';
import { Modal, Form, Input, Select, Button, message } from 'antd';
import { MailOutlined, UserAddOutlined } from '@ant-design/icons';
import { OrgRole } from '@repo/permissions';
import { inviteMember } from '../../services/organization';

const { Option } = Select;

interface InviteMemberModalProps {
  organizationId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function InviteMemberModal({ organizationId, isOpen, onClose, onSuccess }: InviteMemberModalProps) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const handleFinish = async (values: { email: string; role: OrgRole }) => {
    try {
      setSubmitting(true);
      const res = await inviteMember(organizationId, values.email, values.role);
      if (res.success) {
        message.success(`Đã gửi lời mời tới ${values.email} thành công.`);
        form.resetFields();
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      if (err.status === 403) {
        message.error('Bạn không có quyền thực hiện hành động này.');
      } else {
        message.error(err.message || 'Lỗi khi mời thành viên.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        <span className="font-extrabold text-gray-800 text-lg flex items-center gap-2">
          <UserAddOutlined className="text-blue-500" />
          Mời thành viên mới
        </span>
      }
      open={isOpen}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      footer={null}
      centered
      width={400}
      className="invite-member-modal"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{ role: 'MEMBER' }}
        requiredMark={false}
        className="mt-4"
      >
        <Form.Item
          label={<span className="text-gray-700 text-sm font-semibold">Địa chỉ Email</span>}
          name="email"
          rules={[
            { required: true, message: 'Vui lòng nhập email.' },
            { type: 'email', message: 'Định dạng email không hợp lệ.' },
          ]}
        >
          <Input
            size="large"
            placeholder="member@domain.com"
            prefix={<MailOutlined className="text-gray-300" />}
            className="rounded-xl border-gray-200"
          />
        </Form.Item>

        <Form.Item
          label={<span className="text-gray-700 text-sm font-semibold">Vai trò</span>}
          name="role"
          rules={[{ required: true, message: 'Vui lòng chọn vai trò.' }]}
        >
          <Select size="large" className="rounded-xl overflow-hidden">
            <Option value="MEMBER">Regular Member</Option>
            <Option value="ADMIN">System Admin</Option>
          </Select>
        </Form.Item>

        <div className="flex items-center gap-3 mt-6">
          <Button
            disabled={submitting}
            onClick={() => {
              form.resetFields();
              onClose();
            }}
            className="flex-1 rounded-xl h-10 text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center justify-center"
          >
            Hủy
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            className="flex-1 rounded-xl h-10 text-sm font-bold bg-blue-600 hover:bg-blue-700 border-none text-white shadow-md flex items-center justify-center"
          >
            Gửi lời mời
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
