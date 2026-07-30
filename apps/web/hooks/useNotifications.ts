import { useCallback, useEffect, useRef, useState } from "react";
import { getSocket } from "../lib/socket";
import {
  getNotifications,
  markAsRead,
  Notification,
} from "../services/notification";

const NOTIFICATION_STALE_TIME_MS = 60_000;

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
}

export function useNotifications(userId?: string) {
  const [notificationState, setNotificationState] =
    useState<NotificationState>({
      notifications: [],
      unreadCount: 0,
    });
  const [loading, setLoading] = useState(true);
  const requestControllerRef = useRef<AbortController | null>(null);
  const lastFetchedAtRef = useRef(0);

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotificationState({ notifications: [], unreadCount: 0 });
      setLoading(false);
      return;
    }

    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;

    try {
      setLoading(true);

      const response = await getNotifications(false, controller.signal);
      if (response.success) {
        setNotificationState({
          notifications: response.notifications,
          unreadCount: response.unreadCount,
        });
        lastFetchedAtRef.current = Date.now();
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      console.error("Không thể tải thông báo:", error);
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
        setLoading(false);
      }
    }
  }, [userId]);

  // Load once, then refresh on focus only when the current data is stale.
  useEffect(() => {
    fetchNotifications();

    const handleFocus = () => {
      if (
        userId &&
        Date.now() - lastFetchedAtRef.current >= NOTIFICATION_STALE_TIME_MS
      ) {
        fetchNotifications();
      }
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
      requestControllerRef.current?.abort();
    };
  }, [userId, fetchNotifications]);

  // Reuse the singleton socket shared by notifications, Kanban and Presence.
  useEffect(() => {
    if (!userId) return;

    const socket = getSocket();

    const handleNewNotification = (notification: Notification) => {
      setNotificationState((current) => {
        if (
          current.notifications.some((item) => item.id === notification.id)
        ) {
          return current;
        }

        return {
          notifications: [notification, ...current.notifications].slice(0, 10),
          unreadCount:
            current.unreadCount + (notification.isRead ? 0 : 1),
        };
      });
    };

    socket.on("notification:new", handleNewNotification);

    return () => {
      socket.off("notification:new", handleNewNotification);
    };
  }, [userId]);

  const handleMarkAsRead = async (id: string) => {
    const notification = notificationState.notifications.find(
      (item) => item.id === id,
    );
    if (!notification || notification.isRead) return;

    setNotificationState((current) => ({
      notifications: current.notifications.map((item) =>
        item.id === id ? { ...item, isRead: true } : item,
      ),
      unreadCount: Math.max(0, current.unreadCount - 1),
    }));

    try {
      await markAsRead(id);
    } catch (error) {
      setNotificationState((current) => ({
        notifications: current.notifications.map((item) =>
          item.id === id ? { ...item, isRead: false } : item,
        ),
        unreadCount: current.unreadCount + 1,
      }));
      console.error("Không thể đánh dấu đã đọc:", error);
    }
  };

  return {
    notifications: notificationState.notifications,
    unreadCount: notificationState.unreadCount,
    loading,
    markAsRead: handleMarkAsRead,
    refresh: fetchNotifications,
  };
}
