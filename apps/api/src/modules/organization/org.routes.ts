
/**
 * @openapi
 * tags:
 *   name: Organizations
 *   description: Quản lý tổ chức
 * 
 * /organizations:
 *   get:
 *     tags: [Organizations]
 *     summary: Lấy danh sách tổ chức của user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 *   post:
 *     tags: [Organizations]
 *     summary: Tạo tổ chức mới
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tạo thành công
 * 
 * /organizations/{id}:
 *   get:
 *     tags: [Organizations]
 *     summary: Lấy chi tiết tổ chức
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
 *   patch:
 *     tags: [Organizations]
 *     summary: Cập nhật thông tin tổ chức
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 * 
 * /organizations/{id}/stats:
 *   get:
 *     tags: [Organizations]
 *     summary: Lấy thống kê tổ chức
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
 * 
 * /organizations/{id}/members:
 *   get:
 *     tags: [Organizations]
 *     summary: Lấy danh sách thành viên
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
 * 
 * /organizations/{id}/members/invite:
 *   post:
 *     tags: [Organizations]
 *     summary: Mời thành viên mới
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       200:
 *         description: Mời thành công
 * 
 * /organizations/{id}/members/{memberId}/role:
 *   patch:
 *     tags: [Organizations]
 *     summary: Đổi role thành viên
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *     responses:
 *       200:
 *         description: Thành công
 * 
 * /organizations/{id}/members/{memberId}:
 *   delete:
 *     tags: [Organizations]
 *     summary: Xóa thành viên
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thành công
 */

import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware';
import { requirePermission } from '../../common/middlewares/permission.middleware';
import * as orgController from './org.controller';

const router = Router();

// Toàn bộ các route dưới đây yêu cầu đăng nhập
router.use(authenticate);

// 1. Quản lý thông tin chung tổ chức
router.get('/', orgController.getUserOrganizationsHandler);
router.post('/', orgController.createOrganizationHandler);
router.get('/by-slug/:slug', orgController.getOrganizationBySlugHandler);
router.get('/:id/stats', orgController.getOrganizationStatsHandler);
router.get('/:id/dashboard-summary', requirePermission('view:personal-dashboard'), orgController.getDashboardSummaryHandler);
router.get('/:id/activities', requirePermission('view:org-activities'), orgController.getOrganizationActivitiesHandler);
router.get('/:id/tasks/me', requirePermission('view:personal-dashboard'), orgController.getMyTasksHandler);
router.get('/:id/my-tasks', requirePermission('view:personal-dashboard'), orgController.getMyTasksHandler);
router.get('/:id', orgController.getOrganizationHandler);
router.patch('/:id', requirePermission('view:org-settings'), orgController.updateOrganizationHandler);

// 2. Quản lý thành viên trong tổ chức
router.get('/:id/members', requirePermission('view:members'), orgController.getMembersHandler);
router.post('/:id/members/invite', requirePermission('member:invite'), orgController.inviteMemberHandler);
router.post('/:id/invitations/:invitationId/resend', requirePermission('member:invite'), orgController.resendInvitationHandler);
router.patch('/:id/members/:memberId/role', requirePermission('member:change-role'), orgController.updateMemberRoleHandler);
router.patch('/:id/members/:memberId/status', requirePermission('member:change-role'), orgController.updateMemberStatusHandler);
router.delete('/:id/members/:memberId', requirePermission('member:remove'), orgController.removeMemberHandler);

import projectRoutes from '../project/project.routes';

// 3. Quản lý dự án trong tổ chức
router.use('/:id/projects', projectRoutes);

export default router;
