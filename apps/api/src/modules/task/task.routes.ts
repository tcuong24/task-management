
/**
 * @openapi
 * tags:
 *   name: Tasks
 *   description: Quản lý công việc
 * 
 * /organizations/{id}/projects/{projectId}/tasks:
 *   get:
 *     tags: [Tasks]
 *     summary: Lấy danh sách tasks
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thành công
 *   post:
 *     tags: [Tasks]
 *     summary: Tạo task mới
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: projectId
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
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *               priority:
 *                 type: string
 *     responses:
 *       201:
 *         description: Thành công
 * 
 * /organizations/{id}/projects/{projectId}/tasks/{taskId}:
 *   get:
 *     tags: [Tasks]
 *     summary: Lấy chi tiết task
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thành công
 *   put:
 *     tags: [Tasks]
 *     summary: Cập nhật task
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: taskId
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
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *               priority:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *   delete:
 *     tags: [Tasks]
 *     summary: Xóa task
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa thành công
 * 
 * /organizations/{id}/projects/{projectId}/tasks/{taskId}/move:
 *   patch:
 *     tags: [Tasks]
 *     summary: Di chuyển task (cập nhật vị trí/trạng thái)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: taskId
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
 *               newStatus:
 *                 type: string
 *               newPosition:
 *                 type: number
 *     responses:
 *       200:
 *         description: Thành công
 */

import { Router } from 'express';
import { requirePermission } from '../../common/middlewares/permission.middleware';
import * as taskController from './task.controller';

// mergeParams is required to access :projectId from the parent router
const router = Router({ mergeParams: true });

// List and view tasks (auth is required, but any project member can view)
// We rely on the parent route's authentication.
router.get('/', taskController.getTasksHandler);
router.get('/:taskId', taskController.getTaskHandler);

// Create task requires task:create permission (MEMBER+)
router.post('/', requirePermission('task:create'), taskController.createTaskHandler);

// Update task requires edit permissions
// Ideally the controller should differentiate edit:own vs edit:all, but allowing edit:own to pass middleware
router.put('/:taskId', requirePermission('task:edit:own'), taskController.updateTaskHandler);
router.patch('/:taskId/move', requirePermission('task:edit:own'), taskController.moveTaskHandler);

// Delete task requires delete permissions
router.delete('/:taskId', requirePermission('task:delete:own'), taskController.deleteTaskHandler);

export default router;
