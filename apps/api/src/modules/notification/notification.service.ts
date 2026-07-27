import { prisma, NotificationType } from '@repo/database';
import { AppError } from '../../common/errors';
import { emitToUser } from '../../common/socket';

/**
 * Lấy danh sách thông báo của user (giới hạn 10 cái gần nhất)
 */
export async function getNotifications(userId: string, unreadOnly: boolean) {
  return prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly ? { isRead: false } : {}),
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
  });
}

/**
 * Đánh dấu một thông báo là đã đọc
 */
export async function markAsRead(notificationId: string, userId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });

  if (!notification) {
    throw new AppError(404, 'NOTIFICATION_NOT_FOUND', 'Không tìm thấy thông báo.');
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
}

/**
 * Tạo thông báo mới và emit realtime qua socket
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  content: string,
  payload?: any
) {
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      content,
      payload: payload || null,
    },
  });

  // Emit event realtime cho user
  emitToUser(userId, 'notification:new', notification);

  return notification;
}
