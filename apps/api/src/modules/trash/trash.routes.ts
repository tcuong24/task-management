/**
 * @openapi
 * tags:
 *   name: Trash
 *   description: Quản lý thùng rác cấp tổ chức
 *
 * /organizations/{id}/trash:
 *   get:
 *     tags: [Trash]
 *     summary: Lấy danh sách mục đã xóa trong thùng rác
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, project, task]
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Thành công
 */

import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware';
import { requirePermission } from '../../common/middlewares/permission.middleware';
import * as trashController from './trash.controller';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/', requirePermission('trash:view'), trashController.getTrashHandler);
router.post('/projects/:projectId/restore', requirePermission('trash:restore'), trashController.restoreProjectHandler);
router.post('/tasks/:taskId/restore', requirePermission('trash:restore'), trashController.restoreTaskHandler);
router.delete('/projects/:projectId', requirePermission('trash:purge'), trashController.purgeProjectHandler);
router.delete('/tasks/:taskId', requirePermission('trash:purge'), trashController.purgeTaskHandler);

export default router;
