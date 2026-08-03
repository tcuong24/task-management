'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket } from '../lib/socket';

export interface LiveCursor {
  userId: string;
  fullName: string;
  username: string;
  avatarUrl: string | null;
  x: number;
  y: number;
  updatedAt: number;
}

interface CursorMovePayload extends LiveCursor {
  room: string;
}

interface CursorLeavePayload {
  room: string;
  userId: string;
}

const CURSOR_THROTTLE_MS = 40;
const CURSOR_STALE_MS = 5_000;

export function useLiveCursors(room?: string) {
  const [cursors, setCursors] = useState<Record<string, LiveCursor>>({});
  const lastSentAtRef = useRef(0);
  const lastPositionRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!room) {
      setCursors({});
      return;
    }

    const socket = getSocket();

    const joinCursorRoom = () => {
      socket.emit('cursor:join', { room });
    };

    // Nhận vị trí cursor mới từ người dùng khác.
    const handleCursorMoved = (payload: CursorMovePayload) => {
      if (!payload || payload.room !== room || !payload.userId) return;

      setCursors((current) => ({
        ...current,
        [payload.userId]: {
          userId: payload.userId,
          fullName: payload.fullName,
          username: payload.username,
          avatarUrl: payload.avatarUrl,
          x: payload.x,
          y: payload.y,
          updatedAt: Date.now(),
        },
      }));
    };

    // Xóa cursor ngay khi người dùng đưa chuột ra khỏi vùng dự án.
    const handleCursorLeft = (payload: CursorLeavePayload) => {
      if (!payload || payload.room !== room) return;

      setCursors((current) => {
        if (!current[payload.userId]) return current;

        const next = { ...current };
        delete next[payload.userId];
        return next;
      });
    };

    socket.on('connect', joinCursorRoom);
    socket.on('cursor:moved', handleCursorMoved);
    socket.on('cursor:left', handleCursorLeft);

    if (socket.connected) {
      joinCursorRoom();
    }

    const heartbeatInterval = window.setInterval(() => {
      if (socket.connected && lastPositionRef.current) {
        socket.emit('cursor:move', { room, ...lastPositionRef.current });
      }
    }, 2_000);

    // Dọn cursor bị treo do mất mạng hoặc tab bị đóng đột ngột.
    const staleCursorInterval = window.setInterval(() => {
      const now = Date.now();

      setCursors((current) => {
        let changed = false;
        const next: Record<string, LiveCursor> = {};

        for (const [userId, cursor] of Object.entries(current)) {
          if (now - cursor.updatedAt <= CURSOR_STALE_MS) {
            next[userId] = cursor;
          } else {
            changed = true;
          }
        }

        return changed ? next : current;
      });
    }, 1_000);

    return () => {
      socket.emit('cursor:leave', { room });
      socket.off('connect', joinCursorRoom);
      socket.off('cursor:moved', handleCursorMoved);
      socket.off('cursor:left', handleCursorLeft);
      window.clearInterval(heartbeatInterval);
      window.clearInterval(staleCursorInterval);
      lastPositionRef.current = null;
      setCursors({});
    };
  }, [room]);

  const sendCursorPosition = useCallback(
    (x: number, y: number) => {
      if (!room) return;

      const now = Date.now();

      // Giới hạn khoảng 25 event/giây để giảm tải socket và render.
      if (now - lastSentAtRef.current < CURSOR_THROTTLE_MS) return;

      lastSentAtRef.current = now;
      lastPositionRef.current = { x, y };

      const socket = getSocket();
      if (!socket.connected) return;

      socket.emit('cursor:move', {
        room,
        x,
        y,
      });
    },
    [room],
  );

  const removeCursor = useCallback(() => {
    if (!room) return;

    lastPositionRef.current = null;
    getSocket().emit('cursor:hide', { room });
  }, [room]);

  return {
    cursors: Object.values(cursors),
    sendCursorPosition,
    removeCursor,
  };
}
