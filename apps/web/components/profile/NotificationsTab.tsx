"use client";

import React, { useEffect, useState } from "react";
import { Spin, App } from "antd";
import {
  BellOutlined,
  UserAddOutlined,
  CheckSquareOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/vi";
import * as notificationService from "../../services/notification";

dayjs.extend(relativeTime);

export function NotificationsTab() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<notificationService.Notification[]>([]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationService.getNotifications();
      if (res.success) {
        setNotifications(res.notifications || []);
      }
    } catch (err: any) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await notificationService.markAsRead(id);
      if (res.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
        );
      }
    } catch (err: any) {
      message.error("Không thể đánh dấu đã đọc.");
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    try {
      const unreadList = notifications.filter((n) => !n.isRead);
      await Promise.all(unreadList.map((n) => notificationService.markAsRead(n.id)));
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      message.success("Đã đánh dấu tất cả là đã đọc.");
    } catch (err: any) {
      message.error("Đã xảy ra lỗi khi đánh dấu.");
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-12 flex justify-center items-center border border-gray-200 shadow-sm">
        <Spin size="medium" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Responsive Header */}
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <BellOutlined className="text-blue-600 text-xl" />
            <h2 className="text-lg font-bold text-gray-900 m-0">
              Thông báo {unreadCount > 0 && <span className="text-blue-600">({unreadCount} chưa đọc)</span>}
            </h2>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md px-2 py-1 min-h-[36px]"
            >
              Đánh dấu tất cả là đã đọc
            </button>
          )}
        </div>

        {notifications.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {notifications.map((item) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => !item.isRead && handleMarkAsRead(item.id)}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && !item.isRead) {
                    e.preventDefault();
                    handleMarkAsRead(item.id);
                  }
                }}
                className={`p-5 hover:bg-gray-50/80 transition-colors duration-150 ease-out flex gap-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset ${
                  !item.isRead ? "bg-blue-50/30" : ""
                }`}
              >
                <div
                  className={`w-2.5 h-2.5 mt-2 rounded-full shrink-0 ${
                    !item.isRead ? "bg-blue-600" : "bg-transparent"
                  }`}
                />

                {item.type === "ORG_INVITE" && (
                  <div className="bg-blue-50 text-blue-600 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-blue-100">
                    <UserAddOutlined className="text-lg" />
                  </div>
                )}
                {item.type === "TASK_ASSIGNED" && (
                  <div className="bg-amber-50 text-amber-600 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-amber-100">
                    <CheckSquareOutlined className="text-lg" />
                  </div>
                )}
                {item.type !== "ORG_INVITE" && item.type !== "TASK_ASSIGNED" && (
                  <div className="bg-gray-100 text-gray-600 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-gray-200">
                    <InfoCircleOutlined className="text-lg" />
                  </div>
                )}

                <div className="flex-1 text-left">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-semibold text-sm text-gray-900 m-0">
                      {item.title}
                    </p>
                    <span className="text-xs text-gray-500">
                      {dayjs(item.createdAt).fromNow()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 m-0 leading-relaxed">
                    {item.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-xs font-medium text-gray-400">
            Không có thông báo nào.
          </div>
        )}
      </div>
    </div>
  );
}
