import { Request, Response, NextFunction } from 'express';
import * as taskService from './task.service';
import { validateCreateTask, validateUpdateTask, validateMoveTask, validateQueryTask } from './task.validation';
import { ValidationError, AppError } from '../../common/errors';
import { prisma } from '@repo/database';

export async function getTasksHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const rawProjectId = req.params.projectId;
    const projectId = Array.isArray(rawProjectId) ? rawProjectId[0] : rawProjectId;
    if (!projectId) throw new ValidationError('Thiếu projectId.');

    const filters = validateQueryTask(req.query);

    const tasks = await taskService.getTasks(projectId, filters);
    res.json({ success: true, tasks });
  } catch (err) {
    next(err);
  }
}

export async function getTaskHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const rawProjectId = req.params.projectId;
    const projectId = Array.isArray(rawProjectId) ? rawProjectId[0] : rawProjectId;
    const rawTaskId = req.params.taskId;
    const taskId = Array.isArray(rawTaskId) ? rawTaskId[0] : rawTaskId;
    if (!projectId || !taskId) throw new ValidationError('Thiếu projectId hoặc taskId.');

    const task = await taskService.getTaskById(taskId, projectId);
    res.json({ success: true, task });
  } catch (err) {
    next(err);
  }
}

export async function createTaskHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const rawProjectId = req.params.projectId;
    const projectId = Array.isArray(rawProjectId) ? rawProjectId[0] : rawProjectId;
    const reporterId = req.user?.userId;
    if (!projectId) throw new ValidationError('Thiếu projectId.');
    if (!reporterId) throw new ValidationError('Yêu cầu đăng nhập.');

    const data = validateCreateTask(req.body);

    const task = await taskService.createTask({
      projectId,
      reporterId,
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    });

    res.status(201).json({ success: true, task });
  } catch (err) {
    next(err);
  }
}

export async function updateTaskHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const rawProjectId = req.params.projectId;
    const projectId = Array.isArray(rawProjectId) ? rawProjectId[0] : rawProjectId;
    const rawTaskId = req.params.taskId;
    const taskId = Array.isArray(rawTaskId) ? rawTaskId[0] : rawTaskId;
    const userId = req.user?.userId;
    if (!projectId || !taskId) throw new ValidationError('Thiếu projectId hoặc taskId.');
    if (!userId) throw new ValidationError('Yêu cầu đăng nhập.');

    // 1. Get user role in organization
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { organizationId: true },
    });
    if (!project) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy dự án.');

    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: project.organizationId,
          userId,
        },
      },
    });
    const userRole = membership?.role || 'MEMBER';

    // 2. For MEMBER and GUEST, they can only edit tasks where they are assignee or reporter
    if (userRole === 'MEMBER' || userRole === 'GUEST') {
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (!task) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy task.');
      if (task.assigneeId !== userId && task.reporterId !== userId) {
        throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền chỉnh sửa công việc này (Chỉ assignee hoặc reporter mới có quyền chỉnh sửa).');
      }
    }

    const data = validateUpdateTask(req.body);

    const updateData = {
      ...data,
      startDate: data.startDate !== undefined ? (data.startDate ? new Date(data.startDate) : null) : undefined,
      dueDate: data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate) : null) : undefined,
    };
    if (data.dueDate === null) updateData.dueDate = null;

   const task = await taskService.updateTask(taskId, userId, updateData);
    res.json({ success: true, task });
  } catch (err) {
    next(err);
  }
}

export async function moveTaskHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const rawProjectId = req.params.projectId;
    const projectId = Array.isArray(rawProjectId) ? rawProjectId[0] : rawProjectId;
    const rawTaskId = req.params.taskId;
    const taskId = Array.isArray(rawTaskId) ? rawTaskId[0] : rawTaskId;
    const userId = req.user?.userId;
    if (!projectId || !taskId) throw new ValidationError('Thiếu projectId hoặc taskId.');
    if (!userId) throw new ValidationError('Yêu cầu đăng nhập.');

    // 1. Get user role in organization
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { organizationId: true },
    });
    if (!project) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy dự án.');

    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: project.organizationId,
          userId,
        },
      },
    });
    const userRole = membership?.role || 'MEMBER';

    // 2. For MEMBER and GUEST, they can only move tasks where they are assignee or reporter
    if (userRole === 'MEMBER' || userRole === 'GUEST') {
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (!task) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy task.');
      if (task.assigneeId !== userId && task.reporterId !== userId) {
        throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền chỉnh sửa công việc này (Chỉ assignee hoặc reporter mới có quyền chỉnh sửa).');
      }
    }

    const data = validateMoveTask(req.body);

    const task = await taskService.moveTask(taskId, projectId, data.newStatus, data.newPosition, userId);
    res.json({ success: true, task });
  } catch (err) {
    next(err);
  }
}

export async function deleteTaskHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const rawProjectId = req.params.projectId;
    const projectId = Array.isArray(rawProjectId) ? rawProjectId[0] : rawProjectId;
    const rawTaskId = req.params.taskId;
    const taskId = Array.isArray(rawTaskId) ? rawTaskId[0] : rawTaskId;
    const userId = req.user?.userId;
    if (!projectId || !taskId) throw new ValidationError('Thiếu projectId hoặc taskId.');
    if (!userId) throw new ValidationError('Yêu cầu đăng nhập.');

    // 1. Get user role in organization
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { organizationId: true },
    });
    if (!project) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy dự án.');

    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: project.organizationId,
          userId,
        },
      },
    });
    const userRole = membership?.role || 'MEMBER';

    // 2. For MEMBER and GUEST, they can only delete tasks where they are reporter (creator)
    if (userRole === 'MEMBER' || userRole === 'GUEST') {
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (!task) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy task.');
      if (task.reporterId !== userId) {
        throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền xóa công việc này (Chỉ người tạo/reporter mới có quyền xóa).');
      }
    }

    await taskService.deleteTask(taskId, userId, projectId);
    res.json({ success: true, message: 'Xóa task thành công.' });
  } catch (err) {
    next(err);
  }
}
