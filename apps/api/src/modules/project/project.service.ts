import { prisma } from '@repo/database';
import { AppError } from '../../common/errors/app-error';
import { logActivity } from '../../common/services/activityLog.service';

/**
 * Generate a project key from the project name
 * E.g. "Task Management" -> "TASK", "Mobile App" -> "MOBI"
 */
function generateProjectKey(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    const [first, second] = words;
    if (first && second) {
      return (first.substring(0, 2) + second.substring(0, 2)).toUpperCase();
    }
  }
  return name.substring(0, 4).toUpperCase();
}

/**
 * Create a new project within an organization
 */
export async function createProject(
  organizationId: string,
  ownerId: string,
  name: string,
  key?: string,
  description?: string
) {
  // If key is not provided, auto-generate it
  let projectKey = key ? key.toUpperCase() : generateProjectKey(name);
  if (!projectKey) {
    projectKey = 'PROJ';
  }

  // Ensure key doesn't exceed 20 chars
  projectKey = projectKey.substring(0, 20);

  // Check if project key already exists in the same organization
  const existingProject = await prisma.project.findFirst({
    where: {
      organizationId,
      key: projectKey,
    },
  });

  if (existingProject) {
    // If it was auto-generated and exists, append a random string/number
    if (!key) {
       projectKey = `${projectKey.substring(0, 15)}-${Math.floor(100 + Math.random() * 900)}`;
    } else {
       throw new AppError(400, 'PROJECT_KEY_EXISTS', 'Mã dự án (Key) đã tồn tại trong tổ chức này.');
    }
  }

  const project = await prisma.project.create({
    data: {
      organizationId,
      ownerId,
      name,
      key: projectKey,
      description,
      status: 'ACTIVE',
    },
  });

  logActivity({
    organizationId,
    entityType: 'PROJECT',
    entityId: project.id,
    actorId: ownerId,
    action: 'created',
    metadata: {
      projectName: project.name,
      projectKey: project.key,
    },
  });

  return project;
}

export async function getProjects(orgId: string) {
  return prisma.project.findMany({
    where: { organizationId: orgId },
    include: {
      owner: {
        select: {
          fullName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Tra cứu dự án theo Key trong tổ chức
 */
export async function getProjectByKey(organizationId: string, key: string) {
  const project = await prisma.project.findFirst({
    where: {
      organizationId,
      key: key.toUpperCase(),
    },
    include: {
      owner: {
        select: {
          fullName: true,
          avatarUrl: true,
        },
      },
    },
  });
  if (!project) {
    throw new AppError(404, 'PROJECT_NOT_FOUND', 'Không tìm thấy dự án.');
  }
  return project;
}

export async function getProjectDashboard(projectId: string) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const nextSevenDays = new Date();
  nextSevenDays.setDate(nextSevenDays.getDate() + 7);

  // Stats
  const createdLast7Days = await prisma.task.count({
    where: { projectId, createdAt: { gte: sevenDaysAgo } }
  });

  const updatedLast7Days = await prisma.task.count({
    where: { 
      projectId, 
      updatedAt: { gte: sevenDaysAgo },
      createdAt: { lt: sevenDaysAgo } // Only count tasks updated but not created in the last 7 days to avoid overlap
    }
  });

  const completedLast7Days = await prisma.task.count({
    where: { projectId, status: 'DONE', completedAt: { gte: sevenDaysAgo } }
  });

  const dueSoon = await prisma.task.count({
    where: { 
      projectId, 
      status: { not: 'DONE' }, 
      dueDate: { gte: new Date(), lte: nextSevenDays } 
    }
  });

  // Status breakdown
  const statusGroup = await prisma.task.groupBy({
    by: ['status'],
    where: { projectId },
    _count: { id: true },
  });

  const statusOverview = statusGroup.map(item => ({
    status: item.status,
    count: item._count.id,
  }));

  // Priority breakdown
  const priorityGroup = await prisma.task.groupBy({
    by: ['priority'],
    where: { projectId },
    _count: { id: true },
  });

  const priorityBreakdown = priorityGroup.map(item => ({
    priority: item.priority,
    count: item._count.id,
  }));

  // Task types (Mock since Prisma schema doesn't have TaskType enum yet)
  const taskTypes = [
    { type: 'Task', count: 70 },
    { type: 'Subtask', count: 15 },
    { type: 'Epic', count: 5 },
    { type: 'Bug', count: 10 },
  ];

  return {
    stats: {
      completed: completedLast7Days,
      updated: updatedLast7Days,
      created: createdLast7Days,
      dueSoon: dueSoon,
    },
    statusOverview,
    priorityBreakdown,
    taskTypes,
  };
}

export async function getProjectTimeline(projectId: string) {
  const rootTasks = await prisma.task.findMany({
    where: {
      projectId,
      parentTaskId: null,
    },
    orderBy: [
      { position: 'asc' },
      { createdAt: 'desc' },
    ],
    include: {
      project: { select: { id: true, key: true, name: true } },
      assignee: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
      reporter: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
      labels: { include: { label: true } },
      subTasks: {
        orderBy: [
          { position: 'asc' },
          { createdAt: 'asc' },
        ],
        include: {
          project: { select: { id: true, key: true, name: true } },
          assignee: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
          reporter: { select: { id: true, fullName: true, username: true, avatarUrl: true } },
        },
      },
    },
  });

  return rootTasks.map((t) => {
    const projectKey = t.project?.key || '';
    return {
      ...t,
      displayCode: projectKey ? `${projectKey}-${t.taskNumber}` : `#${t.taskNumber}`,
      subTasks: (t.subTasks || []).map((st: any) => {
        const subKey = st.project?.key || projectKey;
        return {
          ...st,
          displayCode: subKey ? `${subKey}-${st.taskNumber}` : `#${st.taskNumber}`,
        };
      }),
    };
  });
}

