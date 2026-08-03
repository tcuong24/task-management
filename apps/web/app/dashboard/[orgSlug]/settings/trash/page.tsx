"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  Input,
  Tabs,
  Table,
  Tag,
  Avatar,
  Button,
  Modal,
  App,
  Tooltip,
  Alert,
  Spin,
  Pagination,
} from "antd";
import {
  DeleteOutlined,
  SearchOutlined,
  UndoOutlined,
  ExclamationCircleOutlined,
  FolderOutlined,
  FileTextOutlined,
  InboxOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useOrg } from "../../../../../contexts/OrgContext";
import * as trashService from "../../../../../services/trash";
import type { TrashItem } from "../../../../../services/trash";

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateStr));
}

function calculateDaysLeft(expiresAtStr: string) {
  const expiresAt = new Date(expiresAtStr).getTime();
  const now = Date.now();
  const diffMs = expiresAt - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Hết hạn hôm nay";
  return `Còn ${diffDays} ngày`;
}

export default function TrashPage() {
  const { message } = App.useApp();
  const params = useParams();
  const router = useRouter();
  const orgSlug = (params?.orgSlug || params?.id) as string;

  const { currentOrg, userRole } = useOrg();
  const orgId = currentOrg?.id;

  const isOwner = userRole === "OWNER";
  const isAdminOrOwner = userRole === "ADMIN" || userRole === "OWNER";

  const [activeTab, setActiveTab] = useState<"all" | "project" | "task">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [items, setItems] = useState<TrashItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal confirm states
  const [purgeModalOpen, setPurgeModalOpen] = useState(false);
  const [itemToPurge, setItemToPurge] = useState<TrashItem | null>(null);
  const [purging, setPurging] = useState(false);
  const [purgeError, setPurgeError] = useState<string | null>(null);

  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchTrash = useCallback(async () => {
    if (!orgId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await trashService.getTrashItems(orgId, {
        type: activeTab,
        q: debouncedQuery,
        page,
        limit,
        sort: "deletedAt",
        order: "desc",
      });
      if (res.success) {
        setItems(res.items);
        setTotal(res.pagination.total);
      }
    } catch (err: any) {
      console.error("Error fetching trash items:", err);
      setError(err.message || "Không thể tải danh sách thùng rác.");
    } finally {
      setLoading(false);
    }
  }, [orgId, activeTab, debouncedQuery, page, limit]);

  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);

  const handleRestore = async (item: TrashItem) => {
    if (!orgId || !item.canRestore) return;
    try {
      setRestoringId(item.id);
      if (item.type === "project") {
        await trashService.restoreProject(orgId, item.id);
        message.success(`Khôi phục dự án "${item.name}" thành công.`);
      } else {
        await trashService.restoreTask(orgId, item.id);
        message.success(`Khôi phục công việc "${item.name}" thành công.`);
      }
      fetchTrash();
    } catch (err: any) {
      message.error(err.message || "Khôi phục thất bại.");
    } finally {
      setRestoringId(null);
    }
  };

  const handlePurgeConfirm = async () => {
    if (!orgId || !itemToPurge) return;
    try {
      setPurging(true);
      setPurgeError(null);
      if (itemToPurge.type === "project") {
        await trashService.purgeProject(orgId, itemToPurge.id);
        message.success(`Đã xóa vĩnh viễn dự án "${itemToPurge.name}".`);
      } else {
        await trashService.purgeTask(orgId, itemToPurge.id);
        message.success(`Đã xóa vĩnh viễn công việc "${itemToPurge.name}".`);
      }
      setPurgeModalOpen(false);
      setItemToPurge(null);
      fetchTrash();
    } catch (err: any) {
      setPurgeError(err.message || "Xóa vĩnh viễn thất bại.");
    } finally {
      setPurging(false);
    }
  };

  if (!isAdminOrOwner) {
    return (
      <div className="mx-auto w-full max-w-4xl p-4 md:p-6 text-left">
        <Alert
          message="Truy cập bị từ chối"
          description="Chỉ Admin và Owner mới có quyền truy cập Thùng rác của tổ chức."
          type="error"
          showIcon
          className="rounded-2xl border border-red-100"
        />
        <Button
          onClick={() => router.push(`/dashboard/${orgSlug}`)}
          className="mt-4 rounded-xl border border-gray-200 bg-white px-5 font-semibold text-gray-700 hover:bg-gray-50"
        >
          Quay lại Dashboard
        </Button>
      </div>
    );
  }

  const columns = [
    {
      title: "Tên mục",
      dataIndex: "name",
      key: "name",
      render: (_: any, record: TrashItem) => (
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center border text-sm ${
              record.type === "project"
                ? "bg-blue-50 text-blue-600 border-blue-100"
                : "bg-gray-50 text-gray-600 border-gray-100"
            }`}
          >
            {record.type === "project" ? (
              <FolderOutlined />
            ) : (
              <FileTextOutlined />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-gray-900 text-sm truncate">
              {record.name}
            </span>
            {record.displayCode && (
              <span className="text-[11px] font-bold text-gray-500 font-mono tracking-tight">
                {record.displayCode}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Loại",
      dataIndex: "type",
      key: "type",
      width: 110,
      render: (type: "project" | "task") => (
        <Tag
          className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-semibold text-gray-700"
        >
          {type === "project" ? "Dự án" : "Công việc"}
        </Tag>
      ),
    },
    {
      title: "Dự án",
      dataIndex: "project",
      key: "project",
      width: 180,
      render: (proj: TrashItem["project"]) =>
        proj ? (
          <span className="text-xs font-medium text-gray-700 truncate">
            {proj.name} ({proj.key})
          </span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
    },
    {
      title: "Người xóa",
      dataIndex: "deletedBy",
      key: "deletedBy",
      width: 170,
      render: (user: TrashItem["deletedBy"]) =>
        user ? (
          <div className="flex items-center gap-2">
            <Avatar
              src={user.avatarUrl}
              size={24}
              className="bg-gray-100 text-gray-700 font-bold text-[10px]"
            >
              {user.fullName?.charAt(0) || "U"}
            </Avatar>
            <span className="text-xs font-medium text-gray-700 truncate">
              {user.fullName}
            </span>
          </div>
        ) : (
          <span className="text-xs text-gray-400">Hệ thống</span>
        ),
    },
    {
      title: "Đã xóa lúc",
      dataIndex: "deletedAt",
      key: "deletedAt",
      width: 160,
      render: (date: string) => (
        <span className="text-xs text-gray-600">{formatDate(date)}</span>
      ),
    },
    {
      title: "Xóa vĩnh viễn sau",
      dataIndex: "expiresAt",
      key: "expiresAt",
      width: 140,
      render: (expiresAt: string) => (
        <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
          {calculateDaysLeft(expiresAt)}
        </span>
      ),
    },
    {
      title: "Hành động",
      key: "action",
      width: 210,
      align: "right" as const,
      render: (_: any, record: TrashItem) => {
        const isRestoring = restoringId === record.id;

        const restoreBtn = (
          <Button
            size="small"
            icon={<UndoOutlined />}
            loading={isRestoring}
            disabled={!record.canRestore}
            onClick={() => handleRestore(record)}
            className="rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 motion-reduce:transition-none"
          >
            Khôi phục
          </Button>
        );

        return (
          <div className="flex items-center justify-end gap-2">
            {!record.canRestore && record.restoreBlockedReason ? (
              <Tooltip title={record.restoreBlockedReason}>
                <span>{restoreBtn}</span>
              </Tooltip>
            ) : (
              restoreBtn
            )}

            {isOwner && (
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => {
                  setItemToPurge(record);
                  setPurgeError(null);
                  setPurgeModalOpen(true);
                }}
                className="rounded-xl bg-red-600 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition-colors duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 motion-reduce:transition-none"
              >
                Xóa vĩnh viễn
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="mx-auto flex w-full flex-col gap-6 p-2 md:p-3 text-left">


      {/* Main Content Surface */}
      <Card
        className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden"
        styles={{ body: { padding: 0 } }}
      >
        {/* Toolbar: Tabs & Search */}
        <div className="p-2 md:p-3 border-b border-gray-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white">
          <Tabs
            activeKey={activeTab}
            onChange={(key) => {
              setActiveTab(key as any);
              setPage(1);
            }}
            className="border-none text-sm"
            items={[
              { key: "all", label: "Tất cả" },
              { key: "project", label: "Dự án" },
              { key: "task", label: "Công việc" },
            ]}
          />

          <div className="w-full md:w-72">
            <Input
              prefix={<SearchOutlined className="text-gray-400" />}
              placeholder="Tìm theo tên hoặc mã..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
              className="rounded-xl border-gray-200 text-sm h-[38px] hover:border-gray-300 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 border-b border-gray-100">
            <Alert
              message="Lỗi khi tải thùng rác"
              description={error}
              type="error"
              showIcon
              action={
                <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={fetchTrash}
                >
                  Thử lại
                </Button>
              }
            />
          </div>
        )}

        {/* Table Content */}
        <div className="overflow-x-auto">
          <Table
            dataSource={items}
            columns={columns}
            rowKey="id"
            loading={loading}
            pagination={false}
            rowClassName={(_, index) =>
              index % 2 === 0
                ? "bg-white hover:bg-gray-100 transition-colors duration-150"
                : "bg-gray-50/50 hover:bg-gray-100 transition-colors duration-150"
            }
            locale={{
              emptyText: (
                <div className="py-16 text-center flex flex-col items-center justify-center">
                  <InboxOutlined className="text-5xl text-gray-300 mb-3" />
                  <h4 className="text-base font-bold text-gray-700">
                    {debouncedQuery
                      ? "Không tìm thấy kết quả phù hợp"
                      : "Thùng rác trống"}
                  </h4>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm">
                    {debouncedQuery
                      ? "Thử thay đổi từ khóa tìm kiếm hoặc chuyển tab lọc."
                      : "Chưa có dự án hoặc công việc nào bị xóa trong tổ chức này."}
                  </p>
                </div>
              ),
            }}
          />
        </div>

        {/* Footer Pagination */}
        {total > 0 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white">
            <span className="text-xs font-medium text-gray-500">
              Hiển thị {items.length} trên tổng số {total} mục
            </span>
            <Pagination
              current={page}
              pageSize={limit}
              total={total}
              onChange={(p) => setPage(p)}
              showSizeChanger={false}
              size="small"
            />
          </div>
        )}
      </Card>

      {/* Modal Confirm Purge (OWNER only) */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-red-600 font-bold text-lg">
            <ExclamationCircleOutlined />
            <span>Xác nhận xóa vĩnh viễn</span>
          </div>
        }
        open={purgeModalOpen}
        onCancel={() => {
          if (!purging) {
            setPurgeModalOpen(false);
            setItemToPurge(null);
            setPurgeError(null);
          }
        }}
        footer={[
          <Button
            key="cancel"
            disabled={purging}
            onClick={() => {
              setPurgeModalOpen(false);
              setItemToPurge(null);
              setPurgeError(null);
            }}
            className="rounded-xl border border-gray-200 bg-white font-medium text-gray-700 hover:bg-gray-50"
          >
            Hủy
          </Button>,
          <Button
            key="purge"
            type="primary"
            danger
            loading={purging}
            onClick={handlePurgeConfirm}
            className="rounded-xl bg-red-600 font-semibold text-white shadow-md hover:bg-red-700 active:scale-[0.98]"
          >
            Xóa vĩnh viễn
          </Button>,
        ]}
        centered
        width={460}
      >
        <div className="py-2">
          {purgeError && (
            <Alert
              message="Xóa vĩnh viễn thất bại"
              description={purgeError}
              type="error"
              showIcon
              className="mb-3 rounded-xl"
            />
          )}

          <p className="text-sm text-gray-700 mb-3 leading-relaxed">
            Bạn có chắc chắn muốn xóa vĩnh viễn{" "}
            <strong className="text-gray-900 font-bold">
              {itemToPurge?.type === "project" ? "dự án" : "công việc"}{" "}
              "{itemToPurge?.name}"
            </strong>{" "}
            khỏi hệ thống không?
          </p>

          <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-xs text-red-700 leading-normal">
            🚨 <strong>Hành động nguy hiểm:</strong> Bản ghi và toàn bộ dữ liệu phụ thuộc sẽ bị xóa hoàn toàn khỏi cơ sở dữ liệu. Không thể khôi phục sau thao tác này.
          </div>
        </div>
      </Modal>
    </div>
  );
}
