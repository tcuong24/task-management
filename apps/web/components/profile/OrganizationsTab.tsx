"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, Form, Input, App } from "antd";
import { BankOutlined, PlusOutlined } from "@ant-design/icons";
import type { UserMembership } from "../../services/user";
import * as orgService from "../../services/organization";

interface OrganizationsTabProps {
  memberships: UserMembership[];
  onOrgCreated?: () => void;
}

export function OrganizationsTab({ memberships, onOrgCreated }: OrganizationsTabProps) {
  const router = useRouter();
  const { message } = App.useApp();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();

  const handleCreateOrg = async (values: any) => {
    try {
      setCreating(true);
      const res = await orgService.createOrganization(values.name, values.slug);
      if (res.success) {
        message.success("Tạo tổ chức mới thành công!");
        setCreateModalOpen(false);
        form.resetFields();
        if (onOrgCreated) onOrgCreated();
        router.push(`/dashboard/${values.slug}`);
      }
    } catch (err: any) {
      message.error(err.message || "Không thể tạo tổ chức.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        {/* Responsive Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 mb-6">
          <div className="flex items-center gap-3">
            <BankOutlined className="text-blue-600 text-xl" />
            <h2 className="text-lg font-bold text-gray-900 m-0">
              Tổ chức ({memberships.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              form.resetFields();
              setCreateModalOpen(true);
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-medium text-sm rounded-xl transition-colors duration-150 ease-out  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 motion-reduce:transition-none cursor-pointer"
          >
            <PlusOutlined />
            Tạo tổ chức
          </button>
        </div>

        {/* List / Table or Empty State */}
        {memberships.length > 0 ? (
          <div className="overflow-x-auto min-w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-200">
                  <th className="px-4 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wide">
                    Tổ chức
                  </th>
                  <th className="px-4 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wide">
                    Vai trò
                  </th>
                  <th className="px-4 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wide">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wide text-right">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {memberships.map((m) => {
                  const initial = m.organization.name.charAt(0).toUpperCase();
                  return (
                    <tr
                      key={m.organization.id}
                      className="hover:bg-gray-50/80 transition-colors duration-150 ease-out"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-100">
                            {initial}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm text-gray-900">
                              {m.organization.name}
                            </span>
                            <span className="text-xs text-gray-500 font-mono">
                              /{m.organization.slug}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {m.role === "OWNER" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                            Owner
                          </span>
                        )}
                        {m.role === "ADMIN" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                            Admin
                          </span>
                        )}
                        {m.role === "MEMBER" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200 uppercase">
                            Member
                          </span>
                        )}
                        {m.role === "GUEST" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200 uppercase">
                            Guest
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {m.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/dashboard/${m.organization.slug}`)
                          }
                          className="inline-flex items-center justify-center px-3.5 py-1.5 border border-gray-200 hover:border-blue-600 text-gray-700 hover:text-blue-600 rounded-xl text-xs font-semibold transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 min-h-[36px] cursor-pointer"
                        >
                          Truy cập
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Empty State Neutral Icon */
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center text-3xl">
              <BankOutlined />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-gray-900 m-0">
                Bạn chưa tham gia tổ chức nào
              </p>
              <p className="text-xs text-gray-500 m-0 max-w-sm">
                Tạo một tổ chức mới để bắt đầu hợp tác và quản lý dự án cùng đội ngũ của bạn.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                form.resetFields();
                setCreateModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-medium text-sm rounded-xl transition-colors duration-150 ease-out min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 motion-reduce:transition-none cursor-pointer"
            >
              <PlusOutlined />
              Tạo tổ chức
            </button>
          </div>
        )}
      </div>

      {/* Create Org Modal */}
      <Modal
        title={
          <span className="text-lg font-bold text-gray-900">
            Tạo tổ chức mới
          </span>
        }
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={null}
        centered
        width={440}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateOrg}
          className="mt-4 space-y-4 text-left"
        >
          <Form.Item
            name="name"
            label={
              <span className="text-xs font-medium text-gray-700">Tên tổ chức</span>
            }
            rules={[{ required: true, message: "Vui lòng nhập tên tổ chức" }]}
          >
            <Input
              placeholder="VD: Acme Corporation"
              className="h-11 rounded-xl border-gray-200 text-sm focus:border-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              onChange={(e) => {
                const generatedSlug = e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9]/g, "-")
                  .replace(/-+/g, "-");
                form.setFieldValue("slug", generatedSlug);
              }}
            />
          </Form.Item>

          <Form.Item
            name="slug"
            label={
              <span className="text-xs font-medium text-gray-700">Đường dẫn slug</span>
            }
            rules={[{ required: true, message: "Vui lòng nhập slug" }]}
          >
            <Input
              prefix={<span className="text-gray-400">/</span>}
              placeholder="acme-corp"
              className="h-11 rounded-xl border-gray-200 text-sm font-mono focus:border-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          </Form.Item>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium text-sm rounded-xl min-h-[44px] transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl min-h-[44px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {creating ? "Đang tạo..." : "Tạo tổ chức"}
            </button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
