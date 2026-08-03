import { Request, Response, NextFunction } from 'express';
import * as trashService from './trash.service';
import { ValidationError } from '../../common/errors';

export async function getTrashHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const orgIdRaw = req.params.id || req.params.orgId;
    const orgId = Array.isArray(orgIdRaw) ? orgIdRaw[0] : (orgIdRaw as string);
    if (!orgId) throw new ValidationError('Thiếu mã tổ chức.');

    const { type, q, page, limit, sort, order } = req.query;

    const result = await trashService.getTrashItems(orgId, {
      type: type as any,
      q: q as string,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sort: sort as any,
      order: order as any,
    });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

export async function restoreProjectHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const orgIdRaw = req.params.id || req.params.orgId;
    const orgId = Array.isArray(orgIdRaw) ? orgIdRaw[0] : (orgIdRaw as string);
    const projectIdRaw = req.params.projectId;
    const projectId = Array.isArray(projectIdRaw) ? projectIdRaw[0] : (projectIdRaw as string);
    const userId = req.user?.userId;

    if (!orgId || !projectId) throw new ValidationError('Thiếu mã tổ chức hoặc mã dự án.');
    if (!userId) throw new ValidationError('Yêu cầu đăng nhập.');

    const project = await trashService.restoreProject(orgId, projectId, userId);
    res.status(200).json({
      success: true,
      message: 'Khôi phục dự án thành công.',
      project,
    });
  } catch (err) {
    next(err);
  }
}

export async function restoreTaskHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const orgIdRaw = req.params.id || req.params.orgId;
    const orgId = Array.isArray(orgIdRaw) ? orgIdRaw[0] : (orgIdRaw as string);
    const taskIdRaw = req.params.taskId;
    const taskId = Array.isArray(taskIdRaw) ? taskIdRaw[0] : (taskIdRaw as string);
    const userId = req.user?.userId;

    if (!orgId || !taskId) throw new ValidationError('Thiếu mã tổ chức hoặc mã công việc.');
    if (!userId) throw new ValidationError('Yêu cầu đăng nhập.');

    const task = await trashService.restoreTask(orgId, taskId, userId);
    res.status(200).json({
      success: true,
      message: 'Khôi phục công việc thành công.',
      task,
    });
  } catch (err) {
    next(err);
  }
}

export async function purgeProjectHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const orgIdRaw = req.params.id || req.params.orgId;
    const orgId = Array.isArray(orgIdRaw) ? orgIdRaw[0] : (orgIdRaw as string);
    const projectIdRaw = req.params.projectId;
    const projectId = Array.isArray(projectIdRaw) ? projectIdRaw[0] : (projectIdRaw as string);

    if (!orgId || !projectId) throw new ValidationError('Thiếu mã tổ chức hoặc mã dự án.');

    await trashService.purgeProject(orgId, projectId);
    res.status(200).json({
      success: true,
      message: 'Xóa vĩnh viễn dự án thành công.',
    });
  } catch (err) {
    next(err);
  }
}

export async function purgeTaskHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const orgIdRaw = req.params.id || req.params.orgId;
    const orgId = Array.isArray(orgIdRaw) ? orgIdRaw[0] : (orgIdRaw as string);
    const taskIdRaw = req.params.taskId;
    const taskId = Array.isArray(taskIdRaw) ? taskIdRaw[0] : (taskIdRaw as string);

    if (!orgId || !taskId) throw new ValidationError('Thiếu mã tổ chức hoặc mã công việc.');

    await trashService.purgeTask(orgId, taskId);
    res.status(200).json({
      success: true,
      message: 'Xóa vĩnh viễn công việc thành công.',
    });
  } catch (err) {
    next(err);
  }
}
