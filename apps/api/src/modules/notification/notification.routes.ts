import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware';
import * as notificationController from './notification.controller';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * tags:
 *   name: Notifications
 *   description: Quản lý thông báo in-app
 * 
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Lấy danh sách thông báo gần đây của user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: unread
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Nếu là true, chỉ trả về các thông báo chưa đọc
 *     responses:
 *       200:
 *         description: Thành công
 * 
 * /notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Đánh dấu một thông báo là đã đọc
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thành công
 *       404:
 *         description: Không tìm thấy thông báo
 */

// GET /notifications - Lấy thông tin thông báo của user hiện tại
router.get('/', notificationController.getNotificationsHandler);

// PATCH /notifications/:id/read - Đánh dấu thông báo là đã đọc
router.patch('/:id/read', notificationController.markAsReadHandler);

export default router;
