"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { List, Avatar, Skeleton, Empty, Button } from "antd";
import {
  MailOutlined,
  CarryOutOutlined,
  BellOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/vi";
import { Notification } from "../../services/notification";

dayjs.extend(relativeTime);
dayjs.locale("vi");

interface NotificationDropdownProps {
  notifications: Notification[];
  loading: boolean;
  onMarkAsRead: (id: string) => Promise<void>;
  onClose?: () => void;
}

export default function NotificationDropdown({
  notifications,
  loading,
  onMarkAsRead,
  onClose,
}: NotificationDropdownProps) {
  const router = useRouter();

  const handleItemClick = async (item: Notification) => {
    // 1. Đánh dấu đã đọc
    if (!item.isRead) {
      await onMarkAsRead(item.id);
    }

    // Đóng dropdown nếu có handler
    if (onClose) {
      onClose();
    }

    // 2. Điều hướng dựa theo loại thông báo
    if (item.type === "ORG_INVITE" && item.payload?.token) {
      router.push(`/invite/accept?token=${item.payload.token}`);
    } else if (item.type === "TASK_ASSIGNED" && item.payload) {
      const { orgId, projectId, taskId } = item.payload;
      if (orgId && projectId) {
        router.push(`/dashboard/${orgId}/projects/${projectId}`);
      } else {
        router.push("/dashboard");
      }
    } else {
      router.push("/dashboard");
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "ORG_INVITE":
        return (
          <Avatar
            icon={<MailOutlined />}
            className="bg-gray-100 text-gray-700"
          />
        );
      case "TASK_ASSIGNED":
        return (
          <Avatar
            icon={<CarryOutOutlined />}
            className="bg-blue-100 text-blue-600"
          />
        );
      default:
        return (
          <Avatar
            icon={<BellOutlined />}
            className="bg-gray-100 text-gray-600"
          />
        );
    }
  };

  return (
    <div className="w-[360px] bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <span className="font-semibold text-gray-800 text-sm">
          Thông báo gần đây
        </span>
        <BellOutlined className="text-gray-400" />
      </div>

      {/* Content */}
      <div className="max-h-[360px] overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            <Skeleton avatar active paragraph={{ rows: 1 }} />
            <Skeleton avatar active paragraph={{ rows: 1 }} />
            <Skeleton avatar active paragraph={{ rows: 1 }} />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Không có thông báo mới"
            />
          </div>
        ) : (
          <List
            dataSource={notifications}
            renderItem={(item) => (
              <div
                onClick={() => handleItemClick(item)}
                className={`flex gap-3 p-4 border-b border-gray-100 cursor-pointer transition-colors hover:bg-blue-50/40 relative ${
                  !item.isRead ? "bg-gray-50/10" : ""
                }`}
              >
                {/* Icon */}
                <div className="flex-shrink-0">{getIcon(item.type)}</div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span
                      className={`text-xs text-gray-800 truncate block ${!item.isRead ? "font-semibold" : ""}`}
                    >
                      {item.title}
                    </span>
                    {!item.isRead && (
                      <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-1">
                    {item.content}
                  </p>
                  <span className="text-[10px] text-gray-400 block">
                    {dayjs(item.createdAt).fromNow()}
                  </span>
                </div>
              </div>
            )}
          />
        )}
      </div>
    </div>
  );
}
