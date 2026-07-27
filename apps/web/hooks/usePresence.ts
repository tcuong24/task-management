'use client';

import { useEffect, useState } from 'react';
import { getSocket } from '../lib/socket';

export interface PresenceUser {
  userId: string;
  fullName: string;
  username: string;
  avatarUrl: string | null;
}

export function usePresence(room?: string) {
  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!room) {
      setActiveUsers([]);
      return;
    }

    const socket = getSocket();

    const handlePresenceUpdate = (data: { room: string; activeUsers: PresenceUser[] }) => {
      if (data && data.room === room) {
        setActiveUsers(data.activeUsers || []);
      }
    };

    socket.on('presence:update', handlePresenceUpdate);

    // Join room
    socket.emit('presence:join', { room });

    return () => {
      socket.off('presence:update', handlePresenceUpdate);
      socket.emit('presence:leave', { room });
    };
  }, [room]);

  return { activeUsers };
}
