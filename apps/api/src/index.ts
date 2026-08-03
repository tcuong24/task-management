import 'dotenv/config';

// Fix for "Do not know how to serialize a BigInt" when sending JSON responses containing BigInt (e.g. Prisma sizeBytes)
(BigInt.prototype as any).toJSON = function () {
  const intVal = Number(this);
  return Number.isSafeInteger(intVal) ? intVal : this.toString();
};
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setIo } from './common/socket';

import authRoutes from './modules/auth/auth.routes';
import orgRoutes from './modules/organization/org.routes';
import invitationRoutes from './modules/organization/invitation.routes';
import notificationRoutes from './modules/notification/notification.routes';
import adminRoutes from './modules/admin/admin.routes';

import { authenticate } from './modules/auth/auth.middleware';
import { getUserProfile } from './modules/auth/auth.service';
import { globalErrorHandler } from './common/errors';
import { setupSwagger } from './config/swagger';

import { prisma } from '@repo/database';

const app = express();
const port = process.env.PORT || 3001;

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
});

setIo(io);

// ─── Global middleware ───────────────────────────────────────
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

// ─── Swagger Documentation ──────────────────────────────────
setupSwagger(app);

import directTaskRoutes from './modules/task/direct-task.routes';

import userRoutes from './modules/user/user.routes';
import platformRoutes from './modules/platform/platform.routes';

// ─── Public & Protected routes ──────────────────────────────
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/organizations', orgRoutes);
app.use('/invitations', invitationRoutes);
app.use('/notifications', notificationRoutes);
app.use('/tasks', directTaskRoutes);
app.use('/admin', adminRoutes);
app.use('/platform', platformRoutes);

// ─── Protected routes (example) ─────────────────────────────
/**
 * @swagger
 * /users/search:
 *   get:
 *     summary: Tìm kiếm người dùng trên hệ thống
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: Từ khóa tìm kiếm
 *     responses:
 *       200:
 *         description: Danh sách người dùng khớp từ khóa
 */
app.get('/users/search', authenticate, async (req, res, next) => {
  try {
    const q = req.query.q as string;
    const excludeOrgId = req.query.excludeOrgId as string;
    const currentUserId = req.user!.userId;

    if (!q || q.trim() === '') {
      res.json({ success: true, users: [] });
      return;
    }

    const whereClause: any = {
      id: { not: currentUserId },
      OR: [
        { username: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { fullName: { contains: q, mode: 'insensitive' } },
      ],
    };

    if (excludeOrgId) {
      whereClause.memberships = {
        none: {
          organizationId: excludeOrgId,
        },
      };
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        avatarUrl: true,
      },
      take: 20,
    });

    res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
});

app.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await getUserProfile(req.user!.userId);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
});
app.get('/', (req, res) => {
  res.json({ message: 'Hello from Node.js API!' });
});

// ─── Global error handler (must be last) ─────────────────────
app.use(globalErrorHandler);

server.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
