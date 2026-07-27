import { Server, Socket } from 'socket.io';
import * as authService from '../modules/auth/auth.service';

let io: Server | null = null;

export interface SocketUser {
  userId: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
}

function parseCookieString(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    if (parts.length >= 2) {
      const key = parts[0]?.trim();
      const val = parts.slice(1).join('=').trim();
      if (key) cookies[key] = decodeURIComponent(val);
    }
  });
  return cookies;
}

export const setIo = (socketServer: Server) => {
  io = socketServer;

  // Socket.io Authentication Middleware
  io.use(async (socket: Socket, next) => {
    try {
      const authHeaderToken = socket.handshake.auth?.token;
      const cookieHeader = socket.handshake.headers.cookie;
      const cookies = parseCookieString(cookieHeader);
      const token = authHeaderToken || cookies.access_token;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const payload = await authService.verifyAccessToken(token);
      const profile = await authService.getUserProfile(payload.userId);

      socket.data.user = {
        userId: profile.id,
        username: profile.username,
        fullName: profile.fullName || profile.username,
        avatarUrl: profile.avatarUrl,
      } as SocketUser;

      socket.data.joinedRooms = new Set<string>();

      next();
    } catch (err) {
      console.error('Socket authentication error:', err);
      next(new Error('Authentication error'));
    }
  });

  // Socket Connection Handlers
  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as SocketUser | undefined;
    if (user) {
      socket.join(`user:${user.userId}`);
    }

    // Presence: Join Room
    socket.on('presence:join', async ({ room }: { room: string }) => {
      if (!room) return;
      socket.join(room);
      if (socket.data.joinedRooms) {
        socket.data.joinedRooms.add(room);
      }
      await broadcastRoomPresence(room);
    });

    // Presence: Leave Room
    socket.on('presence:leave', async ({ room }: { room: string }) => {
      if (!room) return;
      socket.leave(room);
      if (socket.data.joinedRooms) {
        socket.data.joinedRooms.delete(room);
      }
      await broadcastRoomPresence(room);
    });

    // Disconnect Handler
    socket.on('disconnect', async () => {
      const rooms: string[] = socket.data.joinedRooms
        ? Array.from(socket.data.joinedRooms as Set<string>)
        : [];
      for (const room of rooms) {
        await broadcastRoomPresence(room);
      }
    });
  });
};

export const getIo = (): Server | null => {
  return io;
};

async function broadcastRoomPresence(room: string) {
  if (!io) return;
  try {
    const sockets = await io.in(room).fetchSockets();
    const userMap = new Map<string, SocketUser>();

    for (const s of sockets) {
      const u = s.data.user as SocketUser | undefined;
      if (u && u.userId) {
        userMap.set(u.userId, u);
      }
    }

    const activeUsers = Array.from(userMap.values());
    io.to(room).emit('presence:update', { room, activeUsers });
  } catch (err) {
    console.error('Error broadcasting presence:', err);
  }
}

export const emitToUser = (userId: string, event: string, data: any) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

export const broadcastTaskCreated = (projectId: string, task: any) => {
  if (io) {
    io.to(`project:${projectId}`).emit('task:created', { task, projectId });
  }
};

export const broadcastTaskUpdated = (projectId: string, taskId: string, changedFields: any) => {
  if (io) {
    io.to(`project:${projectId}`).emit('task:updated', { taskId, projectId, changedFields });
    io.to(`task:${taskId}`).emit('task:updated', { taskId, projectId, changedFields });
  }
};

export const broadcastCommentAdded = (projectId: string, taskId: string, comment: any) => {
  if (io) {
    io.to(`task:${taskId}`).emit('task:comment_added', { taskId, projectId, comment });
    io.to(`project:${projectId}`).emit('task:comment_added', { taskId, projectId, comment });
  }
};
