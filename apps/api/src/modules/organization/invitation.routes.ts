import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware';
import * as orgController from './org.controller';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Invitations
 *   description: Quản lý lời mời tham gia tổ chức
 * 
 * /invitations/{token}:
 *   get:
 *     tags: [Invitations]
 *     summary: Lấy thông tin chi tiết lời mời bằng token
 *     description: Hiển thị tên tổ chức, vai trò được mời và người mời mà không cần đăng nhập.
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lấy thông tin thành công
 *       404:
 *         description: Không tìm thấy lời mời
 * 
 * /invitations/{token}/accept:
 *   post:
 *     tags: [Invitations]
 *     summary: Chấp nhận lời mời tham gia tổ chức
 *     description: Người dùng đăng nhập chấp nhận lời mời, tự động tham gia tổ chức.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tham gia tổ chức thành công
 *       400:
 *         description: Lời mời hết hạn hoặc không hợp lệ
 *       403:
 *         description: Email tài khoản không trùng khớp với email được mời
 *       404:
 *         description: Không tìm thấy lời mời
 * 
 * /invitations/{token}/decline:
 *   post:
 *     tags: [Invitations]
 *     summary: Từ chối lời mời tham gia tổ chức
 *     description: Người dùng đăng nhập từ chối lời mời, cập nhật trạng thái lời mời sang DECLINED.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Từ chối lời mời thành công
 *       400:
 *         description: Lời mời hết hạn hoặc không hợp lệ
 *       403:
 *         description: Email tài khoản không trùng khớp với email được mời
 *       404:
 *         description: Không tìm thấy lời mời
 */

// GET /invitations/:token - Lấy thông tin lời mời (không yêu cầu đăng nhập để hiển thị trang xác nhận)
router.get('/:token', orgController.getInvitationHandler);

// POST /invitations/:token/accept - Chấp nhận lời mời (yêu cầu đăng nhập)
router.post('/:token/accept', authenticate, orgController.acceptInvitationHandler);

// POST /invitations/:token/decline - Từ chối lời mời (yêu cầu đăng nhập)
router.post('/:token/decline', authenticate, orgController.declineInvitationHandler);

export default router;
