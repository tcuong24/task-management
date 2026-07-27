import { Request, Response, NextFunction } from 'express';
import * as taskService from './task.service';
import { ValidationError } from '../../common/errors';

export async function getTaskByIdHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const rawId = req.params.id;
    const taskId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!taskId) throw new ValidationError('Thiếu taskId.');

    const task = await taskService.getTaskById(taskId);
    res.json({ success: true, task });
  } catch (err) {
    next(err);
  }
}

export async function patchTaskHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const rawId = req.params.id;
    const taskId = Array.isArray(rawId) ? rawId[0] : rawId;
    const userId = req.user?.userId;
    if (!taskId) throw new ValidationError('Thiếu taskId.');
    if (!userId) throw new ValidationError('Yêu cầu đăng nhập.');

    const task = await taskService.updateTask(taskId, userId, req.body);
    res.json({ success: true, task });
  } catch (err) {
    next(err);
  }
}

export async function addCommentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const rawId = req.params.id;
    const taskId = Array.isArray(rawId) ? rawId[0] : rawId;
    const userId = req.user?.userId;
    const { content } = req.body;
    if (!taskId) throw new ValidationError('Thiếu taskId.');
    if (!userId) throw new ValidationError('Yêu cầu đăng nhập.');
    if (!content || !content.trim()) throw new ValidationError('Nội dung bình luận không được để trống.');

    const comment = await taskService.addComment(taskId, userId, content.trim());
    res.json({ success: true, comment });
  } catch (err) {
    next(err);
  }
}

export async function createDirectTaskHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { projectId, title, description, status, priority, assigneeId, parentTaskId, dueDate } = req.body;

    if (!userId) throw new ValidationError('Yêu cầu đăng nhập.');
    if (!projectId) throw new ValidationError('Thiếu projectId.');
    if (!title || !title.trim()) throw new ValidationError('Tiêu đề công việc không được để trống.');

    const task = await taskService.createTask({
      projectId,
      reporterId: userId,
      title: title.trim(),
      description,
      status,
      priority,
      assigneeId,
      parentTaskId,
      dueDate: dueDate ? new Date(dueDate) : null,
    });

    res.status(201).json({ success: true, task });
  } catch (err) {
    next(err);
  }
}

export async function createLabelHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, name, color } = req.body;
    if (!projectId || !name) throw new ValidationError('Thiếu projectId hoặc tên nhãn.');

    const label = await taskService.createLabel(projectId, name.trim(), color || '#4f46e5');
    res.status(201).json({ success: true, label });
  } catch (err) {
    next(err);
  }
}

export async function uploadAttachmentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const rawId = req.params.id;
    const taskId = Array.isArray(rawId) ? rawId[0] : rawId;
    const userId = req.user?.userId;

    if (!taskId) throw new ValidationError('Thiếu taskId.');
    if (!userId) throw new ValidationError('Yêu cầu đăng nhập.');
    if (!req.file) throw new ValidationError('Không tìm thấy file để tải lên.');

    const attachment = await taskService.uploadTaskAttachment(taskId, userId, req.file);
    res.status(201).json({ success: true, attachment });
  } catch (err) {
    next(err);
  }
}

export async function deleteAttachmentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const rawId = req.params.attachmentId;
    const attachmentId = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!attachmentId) throw new ValidationError('Thiếu attachmentId.');

    await taskService.deleteTaskAttachment(attachmentId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

