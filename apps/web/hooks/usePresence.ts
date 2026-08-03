"use client";

import { useEffect, useState } from "react";
import { getSocket } from "../lib/socket";

export interface PresenceUser {
  userId: string;
  fullName: string;
  username: string;
  avatarUrl: string | null;
}

export function usePresence(room?: string) {
  // Danh sách người dùng duy nhất đang có mặt trong phòng hiện tại.
  // Component sử dụng hook sẽ lấy activeUsers.length để hiển thị số người đang xem.
  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    // Chưa có room (ví dụ chưa có projectId/taskId) thì không theo dõi presence.
    if (!room) {
      setActiveUsers([]);
      return;
    }

    const socket = getSocket();

    // Nhận danh sách mới nhất do server phát. Kiểm tra đúng room để tránh
    // cập nhật nhầm khi người dùng chuyển nhanh giữa các project/task.
    const handlePresenceUpdate = (data: {
      room: string;
      activeUsers: PresenceUser[];
    }) => {
      if (data && data.room === room) {
        setActiveUsers(data.activeUsers || []);
      }
    };

    const joinRoom = () => {
      socket.emit("presence:join", { room });
    };

    socket.on("connect", joinRoom);
    socket.on("presence:update", handlePresenceUpdate);

    if (socket.connected) {
      joinRoom();
    }

    return () => {
      socket.off("connect", joinRoom);
      socket.off("presence:update", handlePresenceUpdate);
      socket.emit("presence:leave", { room });
    };
  }, [room]);

  // Trả danh sách thay vì chỉ số lượng để UI có thể hiển thị cả avatar/tên.
  return { activeUsers };
}
