
/**
 * @openapi
 * tags:
 *   name: Projects
 *   description: Quản lý dự án
 * 
 * /organizations/{id}/projects:
 *   post:
 *     tags: [Projects]
 *     summary: Tạo dự án mới trong tổ chức
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
 *               key:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Thành công
 */

import { Router } from 'express';
import { requirePermission } from '../../common/middlewares/permission.middleware';
import * as projectController from './project.controller';

// The router is mounted at /organizations/:id/projects
// So we must set mergeParams: true to access :id
const router = Router({ mergeParams: true });

import taskRoutes from '../task/task.routes';

// Create a new project within the organization
router.post('/', requirePermission('project:create'), projectController.createProjectHandler);
router.get('/', requirePermission('view:personal-dashboard'), projectController.getProjectsHandler);
router.get('/by-key/:key', requirePermission('view:personal-dashboard'), projectController.getProjectByKeyHandler);

// Get project dashboard stats
router.get('/:projectId/dashboard', requirePermission('view:personal-dashboard'), projectController.getProjectDashboardHandler);
router.get('/:projectId/timeline', requirePermission('view:personal-dashboard'), projectController.getProjectTimelineHandler);

// Manage tasks within a project
router.use('/:projectId/tasks', taskRoutes);

export default router;
