'use client';

import React, { useState, useCallback } from 'react';
import { Modal, Form, Select, Button, message, Avatar, Spin } from 'antd';
import { UserAddOutlined } from '@ant-design/icons';
import { OrgRole } from '@repo/permissions';
import { inviteMember } from '../../services/organization';
import { searchUsers, SearchedUser } from '../../services/auth';

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
  const [searching, setSearching] = useState(false);
  const [searchedUsers, setSearchedUsers] = useState<SearchedUser[]>([]);

  const handleSearch = useCallback(async (query: string) => {
    if (!query || query.trim().length === 0) {
      setSearchedUsers([]);
      return;
    }
    try {
      setSearching(true);
      const res = await searchUsers(query);
      if (res.success) {
        setSearchedUsers(res.users || []);
      }
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleFinish = async (values: { email: string; role: OrgRole }) => {
    try {
      setSubmitting(true);
      const res = await inviteMember(organizationId, values.email, values.role);
      if (res.success) {
        message.success(`Đã gửi lời mời tới ${values.email} thành công.`);
        form.resetFields();
        setSearchedUsers([]);
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
        setSearchedUsers([]);
        onClose();
      }}
      footer={null}
      centered
      width={420}
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
          label={<span className="text-gray-700 text-sm font-semibold">Tên người dùng / Email</span>}
          name="email"
          rules={[{ required: true, message: 'Vui lòng nhập Username hoặc Email.' }]}
        >
          <Select
            showSearch
            size="large"
            placeholder="Gõ username (ví dụ: cuong) hoặc email..."
            notFoundContent={searching ? <Spin size="small" /> : 'Nhập username/email để tìm kiếm hoặc thêm trực tiếp'}
            filterOption={false}
            onSearch={handleSearch}
            defaultActiveFirstOption={false}
            className="rounded-xl overflow-hidden"
          >
            {searchedUsers.map((u) => (
              <Option key={u.id} value={u.username}>
                <div className="flex items-center gap-2 py-1">
                  <Avatar
                    size={24}
                    src={u.avatarUrl || undefined}
                    className="bg-indigo-100 text-indigo-700 font-bold text-xs shrink-0"
                  >
                    {u.fullName.charAt(0).toUpperCase()}
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-xs text-gray-900 leading-tight truncate">
                      {u.fullName}
                    </span>
                    <span className="text-[10px] text-gray-400 truncate">
                      @{u.username} {u.email ? `• ${u.email}` : ''}
                    </span>
                  </div>
                </div>
              </Option>
            ))}
          </Select>
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
              setSearchedUsers([]);
              onClose();
            }}
            className="flex-1 rounded-xl h-10 text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center justify-center cursor-pointer"
          >
            Hủy
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            className="flex-1 rounded-xl h-10 text-sm font-bold bg-blue-600 hover:bg-blue-700 border-none text-white shadow-md flex items-center justify-center cursor-pointer"
          >
            Gửi lời mời
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
