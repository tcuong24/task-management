import { prisma } from '@repo/database';
import { AppError } from '../../common/errors/app-error';
import { logActivity } from '../../common/services/activityLog.service';

export const TRASH_RETENTION_DAYS = 30;

export interface TrashItem {
  id: string;
  type: 'project' | 'task';
  name: string;
  displayCode: string | null;
  project: {
    id: string;
    key: string;
    name: string;
  } | null;
  deletedAt: Date;
  deletedBy: {
    id: string;
    fullName: string;
    username: string;
    avatarUrl: string | null;
  } | null;
  expiresAt: Date;
  canRestore: boolean;
  restoreBlockedReason: string | null;
}

export interface TrashQueryParams {
  type?: 'all' | 'project' | 'task';
  q?: string;
  page?: number;
  limit?: number;
  sort?: 'deletedAt';
  order?: 'asc' | 'desc';
}

export async function getTrashItems(
  organizationId: string,
  params: TrashQueryParams,
) {
  const type = params.type || 'all';
  const query = params.q?.trim() || '';
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
  const order = params.order === 'asc' ? 'asc' : 'desc';

  const userSelect = {
    id: true,
    fullName: true,
    username: true,
    avatarUrl: true,
  };

  const calculateExpiresAt = (deletedAt: Date) => {
    const expires = new Date(deletedAt);
    expires.setDate(expires.getDate() + TRASH_RETENTION_DAYS);
    return expires;
  };

  let projectItems: TrashItem[] = [];
  let taskItems: TrashItem[] = [];
  let totalProjects = 0;
  let totalTasks = 0;

  if (type === 'all' || type === 'project') {
    const projectWhere: any = {
      organizationId,
      deletedAt: { not: null },
    };
    if (query) {
      projectWhere.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { key: { contains: query, mode: 'insensitive' } },
      ];
    }

    const [rawProjects, pCount] = await Promise.all([
      prisma.project.findMany({
        where: projectWhere,
        include: {
          deletedBy: { select: userSelect },
        },
        orderBy: { deletedAt: order },
      }),
      prisma.project.count({ where: projectWhere }),
    ]);

    totalProjects = pCount;
    projectItems = rawProjects.map((p) => ({
      id: p.id,
      type: 'project',
      name: p.name,
      displayCode: p.key,
      project: null,
      deletedAt: p.deletedAt!,
      deletedBy: p.deletedBy,
      expiresAt: calculateExpiresAt(p.deletedAt!),
      canRestore: true,
      restoreBlockedReason: null,
    }));
  }

  if (type === 'all' || type === 'task') {
    const taskWhere: any = {
      project: { organizationId },
      deletedAt: { not: null },
    };
    if (query) {
      taskWhere.OR = [
        { title: { contains: query, mode: 'insensitive' } },
      ];
    }

    const [rawTasks, tCount] = await Promise.all([
      prisma.task.findMany({
        where: taskWhere,
        include: {
          deletedBy: { select: userSelect },
          project: {
            select: { id: true, key: true, name: true, deletedAt: true },
          },
          parentTask: {
            select: { id: true, deletedAt: true },
          },
        },
        orderBy: { deletedAt: order },
      }),
      prisma.task.count({ where: taskWhere }),
    ]);

    totalTasks = tCount;
    taskItems = rawTasks.map((t) => {
      let canRestore = true;
      let restoreBlockedReason: string | null = null;

      if (t.project.deletedAt !== null) {
        canRestore = false;
        restoreBlockedReason = 'Dự án chứa công việc này đang nằm trong thùng rác. Vui lòng khôi phục Dự án trước.';
      } else if (t.parentTask && t.parentTask.deletedAt !== null) {
        canRestore = false;
        restoreBlockedReason = 'Công việc cha đang nằm trong thùng rác. Vui lòng khôi phục công việc cha trước.';
      }

      return {
        id: t.id,
        type: 'task',
        name: t.title,
        displayCode: `${t.project.key}-${t.taskNumber}`,
        project: {
          id: t.project.id,
          key: t.project.key,
          name: t.project.name,
        },
        deletedAt: t.deletedAt!,
        deletedBy: t.deletedBy,
        expiresAt: calculateExpiresAt(t.deletedAt!),
        canRestore,
        restoreBlockedReason,
      };
    });
  }

  const allItems = [...projectItems, ...taskItems].sort((a, b) => {
    const timeA = new Date(a.deletedAt).getTime();
    const timeB = new Date(b.deletedAt).getTime();
    return order === 'asc' ? timeA - timeB : timeB - timeA;
  });

  const total = totalProjects + totalTasks;
  const startIndex = (page - 1) * limit;
  const paginatedItems = allItems.slice(startIndex, startIndex + limit);

  return {
    items: paginatedItems,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function restoreProject(
  organizationId: string,
  projectId: string,
  actorId: string,
) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      organizationId,
      deletedAt: { not: null },
    },
  });

  if (!project) {
    throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy dự án trong thùng rác.');
  }

  const restored = await prisma.project.update({
    where: { id: projectId },
    data: {
      deletedAt: null,
      deletedById: null,
    },
  });

  logActivity({
    organizationId,
    entityType: 'PROJECT',
    entityId: projectId,
    actorId,
    action: 'restored',
    metadata: {
      projectName: restored.name,
      projectKey: restored.key,
    },
  });

  return restored;
}

export async function restoreTask(
  organizationId: string,
  taskId: string,
  actorId: string,
) {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      project: { organizationId },
      deletedAt: { not: null },
    },
    include: {
      project: { select: { id: true, key: true, name: true, deletedAt: true } },
      parentTask: { select: { id: true, deletedAt: true } },
    },
  });

  if (!task) {
    throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy công việc trong thùng rác.');
  }

  if (task.project.deletedAt !== null) {
    throw new AppError(
      400,
      'PROJECT_DELETED',
      'Dự án chứa công việc này đang nằm trong thùng rác. Vui lòng khôi phục Dự án trước.',
    );
  }

  if (task.parentTask && task.parentTask.deletedAt !== null) {
    throw new AppError(
      400,
      'PARENT_TASK_DELETED',
      'Công việc cha đang nằm trong thùng rác. Vui lòng khôi phục công việc cha trước.',
    );
  }

  const restored = await prisma.task.update({
    where: { id: taskId },
    data: {
      deletedAt: null,
      deletedById: null,
    },
  });

  logActivity({
    organizationId,
    entityType: 'TASK',
    entityId: taskId,
    actorId,
    action: 'restored',
    metadata: {
      taskTitle: restored.title,
      taskNumber: restored.taskNumber,
      projectName: task.project.name,
      projectKey: task.project.key,
    },
  });

  return restored;
}

export async function purgeProject(
  organizationId: string,
  projectId: string,
) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      organizationId,
      deletedAt: { not: null },
    },
  });

  if (!project) {
    throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy dự án trong thùng rác.');
  }

  await prisma.project.delete({
    where: { id: projectId },
  });

  return { success: true };
}

export async function purgeTask(
  organizationId: string,
  taskId: string,
) {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      project: { organizationId },
      deletedAt: { not: null },
    },
  });

  if (!task) {
    throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy công việc trong thùng rác.');
  }

  await prisma.task.delete({
    where: { id: taskId },
  });

  return { success: true };
}
