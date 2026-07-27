'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, App, Popconfirm, Tag, Select, Modal, Form, Input } from 'antd';
import CustomTooltip from '../common/CustomTooltip';
import { PlusOutlined, SwapOutlined, DeleteOutlined, FolderOpenOutlined, LoadingOutlined } from '@ant-design/icons';
import { OrgRole, hasPermission } from '@repo/permissions';
import * as projectService from '../../services/project';
import * as orgService from '../../services/organization';

interface ProjectListProps {
  initialProjects: projectService.ProjectInfo[];
  organizations: orgService.UserOrgInfo[];
  initialOrgId: string;
  user: any;
}

export default function ProjectList({
  initialProjects,
  organizations,
  initialOrgId,
  user,
}: ProjectListProps) {
  const { message } = App.useApp();

  // Data State
  const [selectedOrgId, setSelectedOrgId] = useState<string>(initialOrgId);
  const [projects, setProjects] = useState<projectService.ProjectInfo[]>(initialProjects);
  const [loading, setLoading] = useState<boolean>(false);

  // Determine role in currently selected organization
  const currentOrg = organizations.find((o) => o.id === selectedOrgId);
  const role = (currentOrg?.userRole || 'MEMBER') as OrgRole;

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  // Fetch projects when org changes (if it changes from initial)
  useEffect(() => {
    if (selectedOrgId === initialOrgId) {
      setProjects(initialProjects);
      return;
    }

    const fetchProjects = async () => {
      try {
        setLoading(true);
        const res = await projectService.getProjects(selectedOrgId);
        if (res.success) {
          setProjects(res.projects);
        }
      } catch (err: any) {
        message.error(err.message || 'Lỗi khi tải danh sách dự án');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [selectedOrgId, initialOrgId, initialProjects, message]);

  // Actions
  const handleArchive = (name: string) => {
    message.warning(`Đã chuyển dự án "${name}" vào mục lưu trữ (Archive).`);
  };

  const handleDelete = (name: string) => {
    message.success(`Đã xóa vĩnh viễn dự án "${name}". Hành động này không thể hoàn tác!`);
  };

  const handleTransfer = (name: string) => {
    message.info(`Yêu cầu chuyển quyền sở hữu dự án "${name}" sang người khác.`);
  };

  const handleCreateProject = async (values: any) => {
    try {
      setSubmitting(true);
      const res = await projectService.createProject(selectedOrgId, {
        name: values.name,
        key: values.key,
        description: values.description,
      });
      if (res.success) {
        message.success('Tạo dự án mới thành công');
        setModalOpen(false);
        form.resetFields();
        // Cập nhật danh sách dự án
        setProjects([...projects, res.project]);
      }
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi tạo dự án');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">


        <div className="flex items-center gap-3">
          {/* Org Switcher */}
          {organizations.length > 0 && (
            <Select
              value={selectedOrgId}
              onChange={(value) => setSelectedOrgId(value)}
              className="min-w-[200px]"
              options={organizations.map((org) => ({
                value: org.id,
                label: org.name,
              }))}
            />
          )}

          {/* Create Project Button - Hidden for Member as per Rule 7 */}
          {hasPermission(role, 'project:create') && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              className="bg-blue-600 border-none font-semibold text-white shadow-sm hover:shadow active:scale-[0.98] rounded-xl flex items-center h-[42px]"
              onClick={() => setModalOpen(true)}
            >
              Tạo dự án mới
            </Button>
          )}
        </div>
      </div>

      {/* Grid of Projects */}
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <LoadingOutlined className="text-3xl text-blue-500" />
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center flex flex-col items-center justify-center">
          <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
            <FolderOpenOutlined className="text-2xl text-blue-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 m-0">Chưa có dự án nào</h3>
          <p className="text-gray-500 mt-1 max-w-md">
            Tổ chức này chưa có dự án nào được tạo. Bạn có thể tạo dự án mới để bắt đầu quản lý công việc.
          </p>
          {hasPermission(role, 'project:create') && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              className="mt-6 bg-blue-600 border-none font-semibold shadow-sm"
              onClick={() => setModalOpen(true)}
            >
              Tạo dự án mới
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-2">
          {projects.map((project) => {
            const isArchived = project.status === 'ARCHIVED';
            return (
              <Card
                key={project.id}
                className="border-none shadow-md rounded-2xl bg-white flex flex-col justify-between"
                styles={{ body: { padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' } }}
              >
                {/* Card Title & Badge */}
                <div className="flex items-start justify-between gap-2 text-left">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">Mã dự án: {project.key}</span>
                    <h3 className="text-lg font-semibold text-gray-800 m-0 leading-tight">
                      {project.name}
                    </h3>
                  </div>
                  <Tag color={isArchived ? 'warning' : 'success'} className="border-none font-semibold px-2 py-0.5 rounded-full select-none">
                    {isArchived ? 'Lưu trữ' : 'Đang chạy'}
                  </Tag>
                </div>

                {/* Description */}
                <p className="text-gray-500 text-sm leading-relaxed m-0 text-left flex-1 line-clamp-3">
                  {project.description || 'Chưa có mô tả chi tiết'}
                </p>

                {/* Owner info */}
                <div className="flex items-center gap-1.5 text-xs text-gray-400 text-left border-t border-gray-50 pt-4">
                  <span>Quản lý dự án:</span>
                  <span className="font-semibold text-gray-600">{project.owner?.fullName || 'Hệ thống'}</span>
                </div>

                {/* Action buttons based on Role (Design Matrix) */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {/* Archive: Neutral-caution (Amber outline) - Admin/Owner */}
                  {hasPermission(role, 'project:archive') && !isArchived && (
                    <Button
                      size="small"
                      className="bg-white border border-amber-300 hover:border-amber-400 text-amber-700 hover:bg-amber-50/50 rounded-lg text-xs font-semibold h-8"
                      onClick={() => handleArchive(project.name)}
                    >
                      Lưu trữ
                    </Button>
                  )}

                  {/* Transfer project ownership: Caution (Amber border) - Owner only */}
                  {hasPermission(role, 'project:transfer-ownership') && (
                    <CustomTooltip title="Chuyển nhượng quyền quản lý dự án">
                      <Button
                        size="small"
                        icon={<SwapOutlined />}
                        className="bg-white border border-amber-300 hover:border-amber-400 text-amber-700 hover:bg-amber-50/50 rounded-lg h-8 flex items-center justify-center p-2"
                        onClick={() => handleTransfer(project.name)}
                      />
                    </CustomTooltip>
                  )}

                  {/* Delete: Destructive (Red fill) - Owner only */}
                  {hasPermission(role, 'project:delete') && (
                    <Popconfirm
                      title="Xóa vĩnh viễn dự án"
                      description={`Bạn có chắc chắn muốn xóa vĩnh viễn dự án "${project.name}"? Hành động này không thể hoàn tác!`}
                      onConfirm={() => handleDelete(project.name)}
                      okText="Xóa vĩnh viễn"
                      cancelText="Hủy"
                      okButtonProps={{ danger: true, className: 'rounded-lg text-xs font-semibold' }}
                      cancelButtonProps={{ className: 'rounded-lg text-xs' }}
                      overlayClassName="elevation-4-confirm-popover"
                    >
                      <Button
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 hover:text-red-700 rounded-lg h-8 flex items-center justify-center p-2 ml-auto"
                        title="Xóa vĩnh viễn"
                      />
                    </Popconfirm>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Create Project */}
      <Modal
        title={<span className="text-xl font-extrabold text-gray-800">Tạo dự án mới</span>}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnHidden
        centered
        classNames={{
          wrapper: 'rounded-2xl shadow-2xl p-6 border border-gray-100',
        }}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateProject} className="mt-4">
          <Form.Item
            name="name"
            label={<span className="font-bold text-gray-700">Tên dự án</span>}
            rules={[{ required: true, message: 'Vui lòng nhập tên dự án' }]}
          >
            <Input placeholder="VD: TaskFlow Core Platform" className="rounded-lg h-11" />
          </Form.Item>

          <Form.Item
            name="key"
            label={<span className="font-bold text-gray-700">Mã dự án (Prefix)</span>}
            rules={[{ required: true, message: 'Vui lòng nhập mã dự án' }]}
            help="Dùng để tạo tiền tố cho các công việc, VD: TFC-1"
          >
            <Input placeholder="VD: TFC" className="rounded-lg h-11 uppercase" />
          </Form.Item>

          <Form.Item
            name="description"
            label={<span className="font-bold text-gray-700">Mô tả</span>}
          >
            <Input.TextArea placeholder="Nhập mô tả dự án..." rows={3} className="rounded-lg" />
          </Form.Item>

          <div className="flex justify-end gap-3 mt-6">
            <Button onClick={() => setModalOpen(false)} disabled={submitting} className="rounded-lg h-11">
              Hủy
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting} className="bg-blue-600 font-semibold rounded-lg h-11">
              Tạo dự án
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
