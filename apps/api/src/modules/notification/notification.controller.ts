import { Request, Response, NextFunction } from 'express';
import * as notificationService from './notification.service';
import { ValidationError } from '../../common/errors';

export async function getNotificationsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new ValidationError('Yêu cầu đăng nhập.');
    }

    const unreadOnly = req.query.unread === 'true';
    const result = await notificationService.getNotifications(userId, unreadOnly);

    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function markAsReadHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { id } = req.params as { id: string };

    if (!userId) {
      throw new ValidationError('Yêu cầu đăng nhập.');
    }
    if (!id) {
      throw new ValidationError('Thiếu ID thông báo.');
    }

    const notification = await notificationService.markAsRead(id, userId);

    res.status(200).json({ success: true, notification });
  } catch (err) {
    next(err);
  }
}
