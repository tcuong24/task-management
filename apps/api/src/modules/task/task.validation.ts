import { TaskStatus, TaskPriority } from '@repo/database';
import { ValidationError } from '../../common/errors';

export function validateCreateTask(body: any) {
  if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
    throw new ValidationError('Tiêu đề là bắt buộc.');
  }

  return {
    title: body.title.trim(),
    description: typeof body.description === 'string' ? body.description : undefined,
    status: Object.values(TaskStatus).includes(body.status) ? body.status : 'TODO',
    priority: Object.values(TaskPriority).includes(body.priority) ? body.priority : 'MEDIUM',
    assigneeId: typeof body.assigneeId === 'string' ? body.assigneeId : null,
    parentTaskId: typeof body.parentTaskId === 'string' ? body.parentTaskId : null,
    startDate: typeof body.startDate === 'string' ? body.startDate : null,
    dueDate: typeof body.dueDate === 'string' ? body.dueDate : null,
  };
}

export function validateUpdateTask(body: any) {
  const data: any = {};
  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim().length === 0) {
      throw new ValidationError('Tiêu đề là bắt buộc.');
    }
    data.title = body.title.trim();
  }
  if (body.description !== undefined) data.description = body.description;
  if (body.status !== undefined && Object.values(TaskStatus).includes(body.status)) data.status = body.status;
  if (body.priority !== undefined && Object.values(TaskPriority).includes(body.priority)) data.priority = body.priority;
  if (body.assigneeId !== undefined) data.assigneeId = body.assigneeId;
  if (body.parentTaskId !== undefined) data.parentTaskId = body.parentTaskId;
  if (body.startDate !== undefined) data.startDate = body.startDate;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate;

  return data;
}

export function validateMoveTask(body: any) {
  if (typeof body.newPosition !== 'number') {
    throw new ValidationError('Vị trí không hợp lệ.');
  }

  return {
    newStatus: Object.values(TaskStatus).includes(body.newStatus) ? body.newStatus : undefined,
    newPosition: body.newPosition,
  };
}

export function validateQueryTask(query: any) {
  return {
    status: Object.values(TaskStatus).includes(query.status) ? query.status : undefined,
    priority: Object.values(TaskPriority).includes(query.priority) ? query.priority : undefined,
    assigneeId: typeof query.assigneeId === 'string' ? query.assigneeId : undefined,
  };
}
