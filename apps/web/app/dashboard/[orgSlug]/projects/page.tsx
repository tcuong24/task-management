"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../../hooks/useAuth";
import { useOrg } from "../../../../contexts/OrgContext";
import { OrgRole, hasPermission } from "@repo/permissions";
import {
  Card,
  Button,
  Tag,
  Avatar,
  Space,
  Modal,
  Form,
  Input,
  App,
  Spin,
  Alert,
} from "antd";
import {
  ProjectOutlined,
  PlusOutlined,
  UserOutlined,
  ArrowRightOutlined,
  FolderOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import * as projectService from "../../../../services/project";

export default function OrgProjectsPage() {
  const { message } = App.useApp();
  const params = useParams();
  const router = useRouter();
  const orgSlug = (params?.orgSlug || params?.id) as string;

  const { currentOrg, userRole } = useOrg();
  const orgId = currentOrg?.id;

  const [projects, setProjects] = useState<projectService.ProjectInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();

  const fetchProjects = useCallback(async () => {
    if (!orgId) return;
    try {
      setLoading(true);
      const res = await projectService.getProjects(orgId);
      if (res.success) {
        setProjects(res.projects);
      }
    } catch (err: any) {
      console.error("Error fetching projects:", err);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreateFinish = async (values: {
    name: string;
    key?: string;
    description?: string;
  }) => {
    if (!orgId) return;
    try {
      setCreating(true);
      await projectService.createProject(orgId, values);
      message.success("Tạo dự án mới thành công!");
      setCreateModalOpen(false);
      form.resetFields();
      fetchProjects();
    } catch (err: any) {
      message.error(err.message || "Tạo dự án thất bại.");
    } finally {
      setCreating(false);
    }
  };

  const canCreateProject =
    userRole && hasPermission(userRole, "project:create");

  return (
    <div className="p-3 md:p-4 flex flex-col gap-6  mx-auto w-full text-left">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2.5">
            <ProjectOutlined className="text-gray-700" />
            <span>Danh sách Dự án</span>
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-0.5">
            Các dự án đang hoạt động trong tổ chức {currentOrg?.name}.
          </p>
        </div>

        {canCreateProject && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalOpen(true)}
            className="bg-blue-600 border-none font-semibold text-white shadow-sm hover:bg-blue-700 rounded-xl h-[42px] px-5"
          >
            Tạo dự án mới
          </Button>
        )}
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Spin size="large" tip="Đang tải danh sách dự án..." />
        </div>
      ) : projects.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center">
          <FolderOutlined className="text-5xl text-gray-300 mb-3" />
          <h3 className="text-lg font-bold text-gray-700">Chưa có dự án nào</h3>
          <p className="text-sm text-gray-400 max-w-md mt-1 mb-4">
            Tổ chức này chưa tạo dự án nào. Hãy tạo dự án đầu tiên để bắt đầu
            quản lý công việc!
          </p>
          {canCreateProject && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalOpen(true)}
              className="bg-blue-600"
            >
              Tạo dự án mới
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p) => {
            const projectUrl = `/dashboard/${orgSlug}/projects/${p.key}`;

            return (
              <Card
                key={p.id}
                hoverable
                onClick={() => router.push(projectUrl)}
                className="border border-gray-100 shadow-sm hover:shadow-md rounded-2xl transition-colors overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-extrabold text-xs px-2.5 py-1 rounded-lg bg-gray-50 text-gray-700 border border-gray-100">
                      KEY: {p.key}
                    </span>
                    <Tag
                      color={p.status === "ACTIVE" ? "success" : "default"}
                      className="rounded-full px-2.5"
                    >
                      {p.status}
                    </Tag>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-gray-700 transition-colors mb-1.5">
                    {p.name}
                  </h3>

                  <p className="text-xs text-gray-500 line-clamp-2 min-h-[36px] mb-4">
                    {p.description || "Chưa có mô tả chi tiết cho dự án này."}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-400 mt-2">
                  <div className="flex items-center gap-2">
                    <Avatar
                      src={p.owner.avatarUrl}
                      size={22}
                      className="bg-gray-100 text-gray-700 font-bold text-[10px]"
                    >
                      {p.owner?.fullName?.charAt(0) || "O"}
                    </Avatar>
                    <span>{p.owner?.fullName || "Chủ dự án"}</span>
                  </div>

                  <span className="text-gray-700 font-bold flex items-center gap-1 hover:underline">
                    Xem Board <ArrowRightOutlined className="text-[10px]" />
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      <Modal
        title={
          <span className="font-bold text-gray-800 text-lg">Tạo dự án mới</span>
        }
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={null}
        centered
        width={480}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateFinish}
          className="mt-4"
        >
          <Form.Item
            label={
              <span className="text-gray-700 text-sm font-semibold">
                Tên dự án
              </span>
            }
            name="name"
            rules={[{ required: true, message: "Vui lòng nhập tên dự án." }]}
          >
            <Input placeholder="Ví dụ: Task Management, Website Redesign..." />
          </Form.Item>

          <Form.Item
            label={
              <span className="text-gray-700 text-sm font-semibold">
                Mã dự án (Key)
              </span>
            }
            name="key"
            tooltip="Mã định danh viết tắt (2-10 ký tự), dùng làm slug URL (ví dụ: TASK, WEB)."
          >
            <Input
              placeholder="Tự động tạo nếu để trống (ví dụ: TASK)"
              maxLength={10}
              className="uppercase"
            />
          </Form.Item>

          <Form.Item
            label={
              <span className="text-gray-700 text-sm font-semibold">Mô tả</span>
            }
            name="description"
          >
            <Input.TextArea
              placeholder="Mô tả mục tiêu của dự án..."
              rows={3}
            />
          </Form.Item>

          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={() => setCreateModalOpen(false)}>Hủy</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={creating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Tạo dự án
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
