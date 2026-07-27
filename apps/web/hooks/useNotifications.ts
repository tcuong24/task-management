import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getNotifications, markAsRead, Notification } from '../services/notification';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const res = await getNotifications();
      if (res.success) {
        setNotifications(res.notifications);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Giải pháp Polling dự phòng mỗi 30 giây
  useEffect(() => {
    if (!userId) return;
    fetchNotifications();

    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [userId, fetchNotifications]);

  // Kết nối Socket.io realtime chính
  useEffect(() => {
    if (!userId) return;

    const socket = io(API_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'], // Đảm bảo fallback tốt
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket.io connected, joining user room:', userId);
      socket.emit('join', userId);
    });

    socket.on('notification:new', (newNotification: Notification) => {
      console.log('Received realtime notification:', newNotification);
      setNotifications((prev) => {
        // Tránh trùng lặp nếu trùng id
        if (prev.some((n) => n.id === newNotification.id)) return prev;
        return [newNotification, ...prev];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [userId]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await markAsRead(id);
      if (res.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead: handleMarkAsRead,
    refresh: fetchNotifications,
  };
}
