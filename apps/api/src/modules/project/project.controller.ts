import { Request, Response, NextFunction } from 'express';
import * as projectService from './project.service';
import { ValidationError } from '../../common/errors';


export async function createProjectHandler(req: Request, res: Response, next: NextFunction) {
  try {
    let orgIdRaw = req.params.id || req.params.orgId;
    const orgId = Array.isArray(orgIdRaw) ? orgIdRaw[0] : (orgIdRaw as string);
    const userId = req.user?.userId;

    if (!orgId) {
      throw new ValidationError('Thiếu ID tổ chức.');
    }
    if (!userId) {
      throw new ValidationError('Yêu cầu đăng nhập.');
    }

    const { name, key, description } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new ValidationError('Tên dự án là bắt buộc.');
    }

    const project = await projectService.createProject(orgId, userId, name, key, description);

    res.status(201).json({
      success: true,
      message: 'Tạo dự án thành công.',
      project,
    });
  } catch (err) {
    next(err);
  }
}

export async function getProjectsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const orgIdRaw = req.params.id || req.params.orgId;
    const orgId = Array.isArray(orgIdRaw) ? orgIdRaw[0] : (orgIdRaw as string);
    if (!orgId) {
      throw new ValidationError('Thiếu ID tổ chức.');
    }
    const projects = await projectService.getProjects(orgId);
    res.status(200).json({ success: true, projects });
  } catch (err) {
    next(err);
  }
}

export async function getProjectByKeyHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const orgIdRaw = req.params.id || req.params.orgId;
    const orgId = Array.isArray(orgIdRaw) ? orgIdRaw[0] : (orgIdRaw as string);
    const { key } = req.params as { key: string };
    if (!orgId || !key) {
      throw new ValidationError('Thiếu ID tổ chức hoặc Key dự án.');
    }
    const project = await projectService.getProjectByKey(orgId, key);
    res.status(200).json({ success: true, project });
  } catch (err) {
    next(err);
  }
}

export async function getProjectDashboardHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const projectIdRaw = req.params.projectId;
    const projectId = Array.isArray(projectIdRaw) ? projectIdRaw[0] : (projectIdRaw as string);
    if (!projectId) {
      throw new ValidationError('Thiếu ID dự án.');
    }
    
    // Check if the user has access to this project (assume permission middleware handles basic access, but we can just fetch it)
    const dashboardData = await projectService.getProjectDashboard(projectId);
    
    res.status(200).json({ success: true, dashboard: dashboardData });
  } catch (err) {
    next(err);
  }
}

export async function getProjectTimelineHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const projectIdRaw = req.params.projectId || req.params.id;
    const projectId = Array.isArray(projectIdRaw) ? projectIdRaw[0] : (projectIdRaw as string);
    if (!projectId) {
      throw new ValidationError('Thiếu ID dự án.');
    }
    const tasks = await projectService.getProjectTimeline(projectId);
    res.status(200).json({ success: true, tasks });
  } catch (err) {
    next(err);
  }
}

export async function deleteProjectHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const orgIdRaw = req.params.id || req.params.orgId;
    const orgId = Array.isArray(orgIdRaw) ? orgIdRaw[0] : (orgIdRaw as string);
    const projectIdRaw = req.params.projectId;
    const projectId = Array.isArray(projectIdRaw) ? projectIdRaw[0] : (projectIdRaw as string);
    const userId = req.user?.userId;

    if (!orgId || !projectId) {
      throw new ValidationError('Thiếu ID tổ chức hoặc ID dự án.');
    }
    if (!userId) {
      throw new ValidationError('Yêu cầu đăng nhập.');
    }

    await projectService.deleteProject(orgId, projectId, userId);
    res.status(200).json({ success: true, message: 'Xóa dự án thành công.' });
  } catch (err) {
    next(err);
  }
}
