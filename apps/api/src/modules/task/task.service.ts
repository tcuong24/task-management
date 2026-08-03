import { prisma } from '@repo/database';
import { TaskStatus, TaskPriority } from '@repo/database';
import { AppError } from '../../common/errors';
import cloudinary from '../../config/cloudinary';
import { logActivity } from '../../common/services/activityLog.service';
import {
  broadcastTaskCreated,
  broadcastTaskUpdated,
  broadcastCommentAdded,
} from '../../common/socket';

export async function getTasks(projectId: string, filters: { status?: TaskStatus; priority?: TaskPriority; assigneeId?: string }) {
  const tasks = await prisma.task.findMany({
    where: {
      projectId,
      deletedAt: null,
      ...(filters.status && { status: filters.status }),
      ...(filters.priority && { priority: filters.priority }),
      ...(filters.assigneeId && { assigneeId: filters.assigneeId }),
    },
    orderBy: [
      { position: 'asc' },
      { createdAt: 'desc' },
    ],
    include: {
      project: { select: { id: true, key: true, name: true } },
      assignee: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
      reporter: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
      labels: {
        include: { label: true },
      },
    },
  });

  return tasks.map((t) => ({
    ...t,
    displayCode: t.project?.key ? `${t.project.key}-${t.taskNumber}` : `#${t.taskNumber}`,
  }));
}

export async function getTaskById(taskId: string, projectId?: string) {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      deletedAt: null,
      project: { deletedAt: null },
      ...(projectId && { projectId }),
    },
    include: {
      project: { select: { id: true, key: true, name: true, organizationId: true } },
      assignee: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
      reporter: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
      labels: { include: { label: true } },
      attachments: { orderBy: { uploadedAt: 'asc' } },
      comments: {
        include: {
          author: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
      subTasks: {
        where: { deletedAt: null },
        select: {
          id: true,
          taskNumber: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          assignee: { select: { id: true, fullName: true, username: true } },
          project: { select: { key: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
      parentTask: {
        select: {
          id: true,
          taskNumber: true,
          title: true,
          status: true,
          project: { select: { key: true } },
        },
      },
    },
  });

  if (!task) {
    throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy task.');
  }

  const taskActivities = await prisma.activityLog.findMany({
    where: {
      entityType: 'TASK',
      entityId: taskId,
    },
    include: {
      actor: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const projectKey = task.project.key;

  return {
    ...task,
    taskActivities,
    displayCode: `${projectKey}-${task.taskNumber}`,
    subTasks: task.subTasks.map((st: any) => ({
      ...st,
      displayCode: `${st.project?.key || projectKey}-${st.taskNumber}`,
    })),
    parentTask: task.parentTask
      ? {
          ...task.parentTask,
          displayCode: `${task.parentTask.project?.key || projectKey}-${task.parentTask.taskNumber}`,
        }
      : null,
  };
}

export async function createTask(data: {
  projectId: string;
  reporterId: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string | null;
  parentTaskId?: string | null;
  startDate?: Date | null;
  dueDate?: Date | null;
}) {
  const { projectId, reporterId, title, description, status, priority, assigneeId, parentTaskId, startDate, dueDate } = data;

  if (startDate && dueDate) {
    if (new Date(startDate) > new Date(dueDate)) {
      throw new AppError(400, 'BAD_REQUEST', 'Ngày bắt đầu không được lớn hơn hạn hoàn thành.');
    }
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Atomic increment of project taskCounter
    const project = await tx.project.update({
      where: { id: projectId },
      data: { taskCounter: { increment: 1 } },
      select: { id: true, key: true, name: true, taskCounter: true, organizationId: true },
    });

    const taskNumber = project.taskCounter;

    // 2. Position calculation
    const targetStatus = status || 'TODO';
    const lastTask = await tx.task.findFirst({
      where: { projectId, status: targetStatus },
      orderBy: { position: 'desc' },
    });
    const position = lastTask ? lastTask.position + 1024 : 1024;

    // 3. Create task
    const newTask = await tx.task.create({
      data: {
        projectId,
        taskNumber,
        title,
        description: description || null,
        status: targetStatus,
        priority: priority || 'MEDIUM',
        position,
        assigneeId: assigneeId || null,
        reporterId,
        parentTaskId: parentTaskId || null,
        startDate: startDate || null,
        dueDate: dueDate || null,
      },
      include: {
        project: { select: { id: true, key: true, name: true } },
        assignee: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
        reporter: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
      },
    });

    // 4. Log ActivityLog
    const displayCode = `${project.key}-${taskNumber}`;
    logActivity({
      organizationId: project.organizationId,
      entityType: 'TASK',
      entityId: newTask.id,
      actorId: reporterId,
      action: 'created',
      newValue: displayCode,
      metadata: {
        taskTitle: title,
        taskNumber,
        projectName: project.name,
        projectKey: project.key,
      },
    });

    const result = {
      ...newTask,
      displayCode,
    };
    broadcastTaskCreated(result.projectId, result);
    return result;
  });
}

export async function updateTask(taskId: string, actorId: string, data: {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string | null;
  startDate?: Date | string | null;
  dueDate?: Date | string | null;
  labelIds?: string[];
  projectId?: string;
}) {
  // Fetch task first to check permissions and old values
  const currentTask = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: { select: { id: true, organizationId: true, key: true, name: true } },
      assignee: { select: { id: true, fullName: true, username: true } },
      labels: { select: { labelId: true } },
    },
  });

  if (!currentTask) {
    throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy công việc.');
  }

  // Validate startDate <= dueDate
  const targetStart = data.startDate !== undefined ? (data.startDate ? new Date(data.startDate) : null) : currentTask.startDate;
  const targetDue = data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate) : null) : currentTask.dueDate;

  if (targetStart && targetDue) {
    if (new Date(targetStart) > new Date(targetDue)) {
      throw new AppError(400, 'BAD_REQUEST', 'Ngày bắt đầu không được lớn hơn hạn hoàn thành.');
    }
  }

  // 1. Permission check
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: currentTask.project.organizationId,
        userId: actorId,
      },
    },
  });

  const userRole = membership?.role || 'MEMBER';

  if (userRole === 'MEMBER' || userRole === 'GUEST') {
    if (currentTask.assigneeId !== actorId && currentTask.reporterId !== actorId) {
      throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền sửa công việc này (Chỉ assignee hoặc reporter mới có quyền).');
    }

    if (data.assigneeId !== undefined && data.assigneeId !== currentTask.assigneeId) {
      throw new AppError(403, 'FORBIDDEN', 'Chỉ ADMIN hoặc OWNER mới có quyền thay đổi người thực hiện.');
    }
  }

  // 2. Perform updates and log TaskActivities in transaction
  return await prisma.$transaction(async (tx) => {
    const activities: { action: string; oldValue?: string | null; newValue?: string | null }[] = [];

    if (data.status !== undefined && data.status !== currentTask.status) {
      activities.push({
        action: 'status_changed',
        oldValue: currentTask.status,
        newValue: data.status,
      });
    }

    if (data.priority !== undefined && data.priority !== currentTask.priority) {
      activities.push({
        action: 'priority_changed',
        oldValue: currentTask.priority,
        newValue: data.priority,
      });
    }

    if (data.assigneeId !== undefined && data.assigneeId !== currentTask.assigneeId) {
      let newAssigneeName = 'Unassigned';
      if (data.assigneeId) {
        const newAssigneeUser = await tx.user.findUnique({
          where: { id: data.assigneeId },
          select: { fullName: true, username: true },
        });
        newAssigneeName = newAssigneeUser?.fullName || newAssigneeUser?.username || data.assigneeId;
      }
      const oldAssigneeName = currentTask.assignee?.fullName || currentTask.assignee?.username || currentTask.assigneeId || 'Unassigned';

      activities.push({
        action: 'assignee_changed',
        oldValue: oldAssigneeName,
        newValue: newAssigneeName,
      });
    }

    if (data.startDate !== undefined) {
      const oldStartStr = currentTask.startDate ? new Date(currentTask.startDate).toISOString().split('T')[0] : null;
      const newStartVal = data.startDate ? new Date(data.startDate).toISOString().split('T')[0] : null;
      if (oldStartStr !== newStartVal) {
        activities.push({
          action: 'start_date_changed',
          oldValue: oldStartStr,
          newValue: newStartVal,
        });
      }
    }

    if (data.dueDate !== undefined) {
      const oldDateStr = currentTask.dueDate ? new Date(currentTask.dueDate).toISOString().split('T')[0] : null;
      const newDateVal = data.dueDate ? new Date(data.dueDate).toISOString().split('T')[0] : null;
      if (oldDateStr !== newDateVal) {
        activities.push({
          action: 'due_date_changed',
          oldValue: oldDateStr,
          newValue: newDateVal,
        });
      }
    }

    if (data.title !== undefined && data.title !== currentTask.title) {
      activities.push({
        action: 'title_changed',
        oldValue: currentTask.title,
        newValue: data.title,
      });
    }

    if (data.description !== undefined && data.description !== currentTask.description) {
      activities.push({
        action: 'description_changed',
        oldValue: currentTask.description,
        newValue: data.description,
      });
    }

    // Insert ActivityLogs
    for (const act of activities) {
      let metadata: Record<string, unknown> = {
        taskTitle: currentTask.title,
        taskNumber: currentTask.taskNumber,
        projectName: currentTask.project.name,
        projectKey: currentTask.project.key,
      };

      if (act.action === 'status_changed') {
        metadata = {
          taskTitle: currentTask.title,
          taskNumber: currentTask.taskNumber,
          projectName: currentTask.project.name,
        };
      } else if (act.action === 'assignee_changed') {
        metadata = {
          taskTitle: currentTask.title,
          assigneeName: act.newValue || 'Unassigned',
        };
      }

      logActivity({
        organizationId: currentTask.project.organizationId,
        entityType: 'TASK',
        entityId: taskId,
        actorId,
        action: act.action,
        oldValue: act.oldValue,
        newValue: act.newValue,
        metadata,
      });
    }

    // Handle labels update if provided
    if (data.labelIds !== undefined) {
      await tx.taskLabel.deleteMany({ where: { taskId } });
      if (data.labelIds.length > 0) {
        await tx.taskLabel.createMany({
          data: data.labelIds.map((labelId) => ({
            taskId,
            labelId,
          })),
        });
      }
    }

    // Update Task record
    const updatedTask = await tx.task.update({
      where: { id: taskId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
        ...(data.startDate !== undefined && {
          startDate: data.startDate ? new Date(data.startDate) : null,
        }),
        ...(data.dueDate !== undefined && {
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
        }),
      },
      include: {
        project: { select: { id: true, key: true, name: true } },
        assignee: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
        reporter: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
        labels: { include: { label: true } },
      },
    });

    const result = {
      ...updatedTask,
      displayCode: `${currentTask.project.key}-${updatedTask.taskNumber}`,
    };
    broadcastTaskUpdated(currentTask.projectId, taskId, data);
    return result;
  });
}

export async function moveTask(taskId: string, projectId: string, newStatus: TaskStatus | undefined, newPosition: number, actorId?: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId, projectId },
    include: {
      project: { select: { id: true, organizationId: true, name: true, key: true } },
    },
  });
  if (!task) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy task.');

  const targetStatus = newStatus || task.status;
  const isStatusChanged = newStatus !== undefined && newStatus !== task.status;

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: targetStatus,
      position: newPosition,
    },
  });

  if (isStatusChanged) {
    logActivity({
      organizationId: task.project.organizationId,
      entityType: 'TASK',
      entityId: taskId,
      actorId: actorId || task.reporterId || 'system',
      action: 'status_changed',
      oldValue: task.status,
      newValue: targetStatus,
      metadata: {
        taskTitle: task.title,
        taskNumber: task.taskNumber,
        projectName: task.project.name,
        projectKey: task.project.key,
      },
    });
  }

  broadcastTaskUpdated(projectId, taskId, { status: targetStatus, position: newPosition });
  return updated;
}

export async function deleteTask(taskId: string, actorId: string, projectId?: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId, ...(projectId && { projectId }) },
    include: { project: { select: { organizationId: true, key: true, name: true } } },
  });
  if (!task) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy task.');

  const now = new Date();
  await prisma.$transaction([
    prisma.task.updateMany({
      where: {
        OR: [
          { id: taskId },
          { parentTaskId: taskId },
        ],
      },
      data: {
        deletedAt: now,
        deletedById: actorId,
      },
    }),
  ]);

  logActivity({
    organizationId: task.project.organizationId,
    entityType: 'TASK',
    entityId: taskId,
    actorId,
    action: 'deleted',
    metadata: {
      taskTitle: task.title,
      taskNumber: task.taskNumber,
      projectName: task.project.name,
      projectKey: task.project.key,
    },
  });

  broadcastTaskUpdated(task.projectId, taskId, { deleted: true });
  return true;
}

export async function addComment(taskId: string, authorId: string, content: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy task.');

  const comment = await prisma.comment.create({
    data: {
      taskId,
      authorId,
      content,
    },
    include: {
      author: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
    },
  });

  broadcastCommentAdded(task.projectId, taskId, comment);
  return comment;
}

export async function createLabel(projectId: string, name: string, color: string) {
  return await prisma.label.upsert({
    where: {
      projectId_name: { projectId, name },
    },
    create: { projectId, name, color },
    update: { color },
  });
}

export async function uploadTaskAttachment(taskId: string, uploaderId: string, file: Express.Multer.File) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy task.');

  const uploadResult = await new Promise<any>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'taskflow/attachments',
        resource_type: 'auto',
      },
      (error, result) => {
        if (error || !result) return reject(error || new Error('Cloudinary upload failed'));
        resolve(result);
      }
    );
    stream.end(file.buffer);
  });

  const attachment = await prisma.attachment.create({
    data: {
      taskId,
      uploaderId,
      fileUrl: uploadResult.secure_url,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    },
    include: {
      uploader: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
    },
  });

  return attachment;
}

export async function deleteTaskAttachment(attachmentId: string) {
  const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
  if (!attachment) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy file đính kèm.');

  await prisma.attachment.delete({ where: { id: attachmentId } });
  return true;
}

