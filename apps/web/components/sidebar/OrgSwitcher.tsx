'use client';

import React, { useState } from 'react';
import { Dropdown, Avatar, Modal, Form, Input, Button, message } from 'antd';
import CustomTooltip from '../common/CustomTooltip';
import {
  UnorderedListOutlined,
  PlusOutlined,
  CheckOutlined,
  DownOutlined,
  BankOutlined,
} from '@ant-design/icons';
import { useOrg } from '../../contexts/OrgContext';
import { OrgRole } from '@repo/permissions';

interface OrgSwitcherProps {
  collapsed: boolean;
}

const ROLE_BADGES: Record<OrgRole, { label: string; color: string }> = {
  OWNER: { label: 'Owner', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  ADMIN: { label: 'Admin', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  MEMBER: { label: 'Member', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  GUEST: { label: 'Guest', color: 'bg-amber-100 text-amber-700 border-amber-200' },
};

export function OrgSwitcher({ collapsed }: OrgSwitcherProps) {
  const { organizations, currentOrg, selectOrg, createNewOrg, loading } = useOrg();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const handleCreateFinish = async (values: { name: string; slug: string }) => {
    try {
      setSubmitting(true);
      await createNewOrg(values.name, values.slug);
      message.success('Tạo tổ chức thành công!');
      setCreateModalOpen(false);
      form.resetFields();
    } catch (err: any) {
      message.error(err.message || 'Tạo tổ chức thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const menuItems = [
    ...organizations.map((org) => {
      const isSelected = currentOrg?.id === org.id;
      const roleBadge = ROLE_BADGES[org.userRole] || ROLE_BADGES.MEMBER;
      return {
        key: org.id,
        label: (
          <div
            onClick={() => selectOrg(org.id)}
            className="flex items-center justify-between gap-3 py-1.5 px-1 cursor-pointer w-full min-w-[200px]"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <Avatar
                src={org.avatarUrl}
                icon={!org.avatarUrl ? <BankOutlined /> : undefined}
                className="bg-indigo-100 text-indigo-600 font-bold border border-indigo-200 flex-shrink-0"
                size={28}
              >
                {org.name.charAt(0).toUpperCase()}
              </Avatar>
              <div className="flex flex-col text-left overflow-hidden">
                <span className="text-sm font-semibold text-gray-800 truncate">{org.name}</span>
                <span className="text-[11px] text-gray-400 font-mono truncate">{org.slug}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${roleBadge.color}`}>
                {roleBadge.label}
              </span>
              {isSelected && <CheckOutlined className="text-indigo-600 text-xs font-bold" />}
            </div>
          </div>
        ),
      };
    }),
    {
      type: 'divider' as const,
    },
    {
      key: 'create_new_org',
      label: (
        <div
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-2 text-indigo-600 font-semibold py-1.5 px-1 cursor-pointer hover:text-indigo-700"
        >
          <PlusOutlined className="text-xs" />
          <span>Tạo tổ chức mới</span>
        </div>
      ),
    },
  ];

  const firstLetter = currentOrg?.name ? currentOrg.name.charAt(0).toUpperCase() : 'O';

  const triggerContent = collapsed ? (
    <CustomTooltip title={currentOrg?.name || 'Chọn tổ chức'} placement="right">
      <div className="flex items-center justify-center p-1 cursor-pointer hover:bg-gray-100 rounded-xl transition-all">
        <Avatar
          src={currentOrg?.avatarUrl}
          icon={!currentOrg?.avatarUrl ? <BankOutlined /> : undefined}
          className="bg-indigo-600 text-white font-bold shadow-sm"
          size={36}
        >
          {firstLetter}
        </Avatar>
      </div>
    </CustomTooltip>
  ) : (
    <div className="flex items-center justify-between p-2 rounded-xl border border-gray-200/80 bg-white hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer select-none">
      <div className="flex items-center gap-2.5 overflow-hidden">
        <Avatar
          src={currentOrg?.avatarUrl}
          icon={!currentOrg?.avatarUrl ? <BankOutlined /> : undefined}
          className="bg-indigo-600 text-white font-bold shadow-sm flex-shrink-0"
          size={32}
        >
          {firstLetter}
        </Avatar>
        <div className="flex flex-col text-left overflow-hidden leading-tight">
          <span className="text-sm font-bold text-gray-800 truncate" title={currentOrg?.name}>
            {currentOrg?.name || (loading ? 'Đang tải...' : 'Chưa chọn org')}
          </span>
          {currentOrg?.userRole && (
            <span className="text-[10px] text-gray-400 font-medium">
              Role: {currentOrg.userRole}
            </span>
          )}
        </div>
      </div>
      <DownOutlined className="text-gray-400 text-xs ml-1 flex-shrink-0" />
    </div>
  );

  if (organizations.length === 0 && !loading) {
    return (
      <>
        {collapsed ? (
          <CustomTooltip title="Tạo tổ chức mới" placement="right">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="w-9 h-9 rounded-xl !bg-indigo-50 !text-indigo-600 border border-indigo-200 flex items-center justify-center hover:!bg-indigo-600 hover:!text-white transition-all mx-auto"
            >
              <PlusOutlined />
            </button>
          </CustomTooltip>
        ) : (
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalOpen(true)}
            className="w-full rounded-xl border-indigo-200 !text-indigo-600 font-semibold hover:!border-indigo-500 hover:!bg-indigo-50 h-[38px] flex items-center justify-center gap-1.5"
          >
            Tạo tổ chức mới
          </Button>
        )}

        {/* Modal tạo tổ chức mới */}
        <Modal
          title={<span className="font-bold text-gray-800 text-lg">Tạo tổ chức mới</span>}
          open={createModalOpen}
          onCancel={() => {
            setCreateModalOpen(false);
            form.resetFields();
          }}
          footer={null}
          centered
          width={440}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreateFinish}
            className="mt-4"
          >
            <Form.Item
              name="name"
              label={<span className="font-semibold text-gray-700">Tên tổ chức</span>}
              rules={[{ required: true, message: 'Vui lòng nhập tên tổ chức.' }]}
            >
              <Input
                placeholder="VD: Acme Corporation"
                onChange={(e) => {
                  const val = e.target.value;
                  const generatedSlug = val
                    .toLowerCase()
                    .trim()
                    .replace(/[^a-z0-9\s-]/g, '')
                    .replace(/\s+/g, '-');
                  form.setFieldsValue({ slug: generatedSlug });
                }}
              />
            </Form.Item>

            <Form.Item
              name="slug"
              label={<span className="font-semibold text-gray-700">Slug (Đường dẫn định danh)</span>}
              rules={[{ required: true, message: 'Vui lòng nhập slug.' }]}
            >
              <Input placeholder="acme-corp" />
            </Form.Item>

            <div className="flex justify-end gap-2 mt-6">
              <Button onClick={() => setCreateModalOpen(false)}>Hủy</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                className="!bg-indigo-600 hover:!bg-indigo-700"
              >
                Tạo mới
              </Button>
            </div>
          </Form>
        </Modal>
      </>
    );
  }

  return (
    <>
      <Dropdown
        menu={{ items: menuItems }}
        trigger={['click']}
        placement="bottomLeft"
        overlayClassName="rounded-xl shadow-xl border border-gray-100 min-w-[240px]"
      >
        {triggerContent}
      </Dropdown>

      {/* Modal tạo tổ chức mới */}
      <Modal
        title={<span className="font-bold text-gray-800 text-lg">Tạo tổ chức mới</span>}
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          form.resetFields();
        }}
        footer={null}
        centered
        width={440}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateFinish}
          className="mt-4"
        >
          <Form.Item
            name="name"
            label={<span className="font-semibold text-gray-700">Tên tổ chức</span>}
            rules={[{ required: true, message: 'Vui lòng nhập tên tổ chức.' }]}
          >
            <Input
              placeholder="VD: Acme Corporation"
              onChange={(e) => {
                const val = e.target.value;
                const generatedSlug = val
                  .toLowerCase()
                  .trim()
                  .replace(/[^a-z0-9\s-]/g, '')
                  .replace(/\s+/g, '-');
                form.setFieldsValue({ slug: generatedSlug });
              }}
            />
          </Form.Item>

          <Form.Item
            name="slug"
            label={<span className="font-semibold text-gray-700">Slug (Đường dẫn định danh)</span>}
            rules={[{ required: true, message: 'Vui lòng nhập slug.' }]}
          >
            <Input placeholder="acme-corp" />
          </Form.Item>

          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={() => setCreateModalOpen(false)}>Hủy</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Tạo mới
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
}
