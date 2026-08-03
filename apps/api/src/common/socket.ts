import { Server, Socket } from "socket.io";
import { prisma } from "@repo/database";
import * as authService from "../modules/auth/auth.service";

let io: Server | null = null;

export interface SocketUser {
  userId: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
}

const CURSOR_TABS = new Set(["summary", "board", "list", "timeline", "task"]);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function canAccessRoom(
  userId: string,
  room: string,
  cursorOnly = false,
): Promise<boolean> {
  const parts = room.split(":");

  if (parts[0] === "project" && parts[1] && UUID_PATTERN.test(parts[1])) {
    const isBaseRoom = parts.length === 2;
    const isCursorRoom =
      parts.length === 4 &&
      parts[2] === "cursor" &&
      !!parts[3] &&
      CURSOR_TABS.has(parts[3]);

    if (cursorOnly ? !isCursorRoom : !isBaseRoom) return false;

    const project = await prisma.project.findFirst({
      where: {
        id: parts[1],
        deletedAt: null,
        organization: {
          members: { some: { userId, status: "ACTIVE" } },
        },
      },
      select: { id: true },
    });

    return !!project;
  }

  if (
    !cursorOnly &&
    parts.length === 2 &&
    parts[0] === "task" &&
    parts[1] &&
    UUID_PATTERN.test(parts[1])
  ) {
    const task = await prisma.task.findFirst({
      where: {
        id: parts[1],
        project: {
          deletedAt: null,
          organization: {
            members: { some: { userId, status: "ACTIVE" } },
          },
        },
      },
      select: { id: true },
    });

    return !!task;
  }

  return false;
}

function parseCookieString(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    if (parts.length >= 2) {
      const key = parts[0]?.trim();
      const val = parts.slice(1).join("=").trim();
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
        return next(new Error("Authentication token required"));
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
      socket.data.cursorRooms = new Set<string>();
      socket.data.lastCursorMoveAt = 0;

      next();
    } catch (err) {
      console.error("Socket authentication error:", err);
      next(new Error("Authentication error"));
    }
  });

  // Socket Connection Handlers
  io.on("connection", (socket: Socket) => {
    const user = socket.data.user as SocketUser | undefined;
    if (user) {
      socket.join(`user:${user.userId}`);
    }

    // Client mở project/task: đưa socket vào room và phát lại danh sách người xem.
    socket.on("presence:join", async ({ room }: { room: string }) => {
      if (!room || !user) return;
      if (!(await canAccessRoom(user.userId, room))) return;

      socket.join(room);
      if (socket.data.joinedRooms) {
        socket.data.joinedRooms.add(room);
      }
      await broadcastRoomPresence(room);
    });

    // Cursor dùng room riêng theo từng tab để tọa độ khớp cùng một giao diện.
    socket.on("cursor:join", async ({ room }: { room: string }) => {
      if (!room || !user) return;
      if (!(await canAccessRoom(user.userId, room, true))) return;

      await socket.join(room);
      socket.data.cursorRooms?.add(room);

      const projectId = getCursorRoomProjectId(room);
      if (projectId) await broadcastCursorLocations(projectId);
    });

    socket.on(
      "cursor:locations:get",
      async ({ projectId }: { projectId: string }) => {
        if (!user || !UUID_PATTERN.test(projectId)) return;
        if (!(await canAccessRoom(user.userId, `project:${projectId}`))) return;

        const locations = await getCursorLocations(projectId);
        socket.emit("cursor:locations", { projectId, locations });
      },
    );

    // Client rời project/task: xóa socket khỏi room rồi cập nhật số người còn lại.
    socket.on("presence:leave", async ({ room }: { room: string }) => {
      if (!room) return;
      socket.leave(room);
      if (socket.data.joinedRooms) {
        socket.data.joinedRooms.delete(room);
      }
      await broadcastRoomPresence(room);
    });
    // Nhận vị trí cursor của một người trong project room.
    socket.on(
      "cursor:move",
      ({ room, x, y }: { room: string; x: number; y: number }) => {
        const user = socket.data.user as SocketUser | undefined;

        // Chỉ xử lý socket đã xác thực và đang thực sự ở trong room.
        if (!user || !room || !socket.data.cursorRooms?.has(room)) return;

        // cursorRooms chỉ chứa các room đã vượt qua bước kiểm tra quyền khi join.
        // Chặn dữ liệu tọa độ không hợp lệ.
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;

        const now = Date.now();
        if (now - Number(socket.data.lastCursorMoveAt || 0) < 30) return;
        socket.data.lastCursorMoveAt = now;

        const normalizedX = Math.min(Math.max(x, 0), 1);
        const normalizedY = Math.min(Math.max(y, 0), 1);

        // socket.to(room) chỉ gửi cho những người khác, không gửi ngược lại người gửi.
        socket.to(room).emit("cursor:moved", {
          room,
          userId: user.userId,
          fullName: user.fullName,
          username: user.username,
          avatarUrl: user.avatarUrl,
          x: normalizedX,
          y: normalizedY,
          updatedAt: now,
        });
      },
    );

    // Người dùng đưa chuột ra khỏi vùng dự án.
    socket.on("cursor:hide", ({ room }: { room: string }) => {
      const user = socket.data.user as SocketUser | undefined;

      if (!user || !room || !socket.data.cursorRooms?.has(room)) return;

      socket.to(room).emit("cursor:left", {
        room,
        userId: user.userId,
      });
    });

    socket.on("cursor:leave", async ({ room }: { room: string }) => {
      const user = socket.data.user as SocketUser | undefined;

      if (!user || !room || !socket.data.cursorRooms?.has(room)) return;

      socket.to(room).emit("cursor:left", {
        room,
        userId: user.userId,
      });
      await socket.leave(room);
      socket.data.cursorRooms?.delete(room);

      const projectId = getCursorRoomProjectId(room);
      if (projectId) await broadcastCursorLocations(projectId);
    });

    socket.on("disconnecting", () => {
      if (!user) return;

      const cursorRooms: string[] = socket.data.cursorRooms
        ? Array.from(socket.data.cursorRooms as Set<string>)
        : [];

      for (const room of cursorRooms) {
        socket.to(room).emit("cursor:left", { room, userId: user.userId });
      }
    });

    // Mất kết nối (đóng tab/mất mạng): cập nhật lại tất cả room socket từng tham gia.
    socket.on("disconnect", async () => {
      const rooms: string[] = socket.data.joinedRooms
        ? Array.from(socket.data.joinedRooms as Set<string>)
        : [];
      for (const room of rooms) {
        await broadcastRoomPresence(room);
      }

      const cursorRooms: string[] = socket.data.cursorRooms
        ? Array.from(socket.data.cursorRooms as Set<string>)
        : [];
      const projectIds = new Set(
        cursorRooms
          .map(getCursorRoomProjectId)
          .filter((projectId): projectId is string => !!projectId),
      );

      for (const projectId of projectIds) {
        await broadcastCursorLocations(projectId);
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
    // Lấy toàn bộ socket đang kết nối trong room. Một người có thể có nhiều socket
    // nếu mở nhiều tab hoặc thiết bị.
    const sockets = await io.in(room).fetchSockets();
    const userMap = new Map<string, SocketUser>();

    // Gom theo userId để mỗi tài khoản chỉ được tính là một người đang xem.
    for (const s of sockets) {
      const u = s.data.user as SocketUser | undefined;
      if (u && u.userId) {
        userMap.set(u.userId, u);
      }
    }

    // Gửi danh sách đã loại trùng tới mọi client trong room; phía frontend dùng
    // activeUsers.length làm số lượng và dữ liệu còn lại để hiển thị tên/avatar.
    const activeUsers = Array.from(userMap.values());
    io.to(room).emit("presence:update", { room, activeUsers });
  } catch (err) {
    console.error("Error broadcasting presence:", err);
  }
}

function getCursorRoomProjectId(room: string): string | undefined {
  const parts = room.split(":");
  return parts.length === 4 && parts[0] === "project" && parts[2] === "cursor"
    ? parts[1]
    : undefined;
}

async function broadcastCursorLocations(projectId: string) {
  if (!io) return;

  const locations = await getCursorLocations(projectId);
  const payload = { projectId, locations };

  for (const section of CURSOR_TABS) {
    io.to(`project:${projectId}:cursor:${section}`).emit(
      "cursor:locations",
      payload,
    );
  }
}

async function getCursorLocations(projectId: string) {
  const locations: Record<string, SocketUser[]> = {};
  if (!io) return locations;

  for (const section of CURSOR_TABS) {
    const room = `project:${projectId}:cursor:${section}`;
    const sockets = await io.in(room).fetchSockets();
    const users = new Map<string, SocketUser>();

    for (const connectedSocket of sockets) {
      const connectedUser = connectedSocket.data.user as SocketUser | undefined;
      if (connectedUser?.userId) {
        users.set(connectedUser.userId, connectedUser);
      }
    }

    locations[section] = Array.from(users.values());
  }

  return locations;
}

export const emitToUser = (userId: string, event: string, data: any) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

export const broadcastTaskCreated = (projectId: string, task: any) => {
  if (io) {
    io.to(`project:${projectId}`).emit("task:created", { task, projectId });
  }
};

export const broadcastTaskUpdated = (
  projectId: string,
  taskId: string,
  changedFields: any,
) => {
  if (io) {
    io.to(`project:${projectId}`).emit("task:updated", {
      taskId,
      projectId,
      changedFields,
    });
    io.to(`task:${taskId}`).emit("task:updated", {
      taskId,
      projectId,
      changedFields,
    });
  }
};

export const broadcastCommentAdded = (
  projectId: string,
  taskId: string,
  comment: any,
) => {
  if (io) {
    io.to(`task:${taskId}`).emit("task:comment_added", {
      taskId,
      projectId,
      comment,
    });
    io.to(`project:${projectId}`).emit("task:comment_added", {
      taskId,
      projectId,
      comment,
    });
  }
};
