import { prisma } from '@repo/database';
import { AppError } from '../../common/errors';
import type { GlobalSearchQuery } from './search.validation';

function relevanceScore(value: string, query: string): number {
  const candidate = value.toLocaleLowerCase();
  const term = query.toLocaleLowerCase();
  if (candidate === term) return 0;
  if (candidate.startsWith(term)) return 1;
  return 2;
}

function parseTaskCode(query: string): { projectKey: string; taskNumber: number } | null {
  const match = query.match(/^([a-z0-9][a-z0-9-]*)-(\d+)$/i);
  if (!match) return null;
  return { projectKey: match[1]!.toUpperCase(), taskNumber: Number(match[2]) };
}

export async function globalSearch(
  organizationId: string,
  userId: string,
  search: GlobalSearchQuery,
) {
  const membership = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    select: { status: true },
  });
  if (!membership || membership.status !== 'ACTIVE') {
    throw new AppError(
      403,
      'FORBIDDEN',
      'Bạn không phải là thành viên đang hoạt động của tổ chức này.',
    );
  }

  const { query, types, limit } = search;
  const candidateLimit = Math.min(limit * 3, 60);
  const taskCode = parseTaskCode(query);

  const [taskRows, projectRows, memberRows] = await Promise.all([
    types.includes('tasks')
      ? prisma.task.findMany({
          where: {
            project: { organizationId },
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              ...(taskCode
                ? [{
                    taskNumber: taskCode.taskNumber,
                    project: {
                      organizationId,
                      key: { equals: taskCode.projectKey, mode: 'insensitive' as const },
                    },
                  }]
                : []),
            ],
          },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            taskNumber: true,
            project: { select: { id: true, key: true, name: true } },
            assignee: {
              select: { id: true, fullName: true, username: true, avatarUrl: true },
            },
          },
          take: candidateLimit,
          orderBy: { updatedAt: 'desc' },
        })
      : Promise.resolve([]),
    types.includes('projects')
      ? prisma.project.findMany({
          where: {
            organizationId,
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { key: { contains: query, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            key: true,
            name: true,
            status: true,
            owner: {
              select: { id: true, fullName: true, username: true, avatarUrl: true },
            },
          },
          take: candidateLimit,
          orderBy: { updatedAt: 'desc' },
        })
      : Promise.resolve([]),
    types.includes('members')
      ? prisma.organizationMember.findMany({
          where: {
            organizationId,
            status: 'ACTIVE',
            user: {
              OR: [
                { fullName: { contains: query, mode: 'insensitive' } },
                { username: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
              ],
            },
          },
          select: {
            id: true,
            role: true,
            user: {
              select: {
                id: true,
                fullName: true,
                username: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
          take: candidateLimit,
          orderBy: { joinedAt: 'desc' },
        })
      : Promise.resolve([]),
  ]);

  const tasks = taskRows
    .map((task) => ({
      id: task.id,
      type: 'task' as const,
      title: task.title,
      displayCode: `${task.project.key}-${task.taskNumber}`,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      project: task.project,
      assignee: task.assignee,
    }))
    .sort((a, b) =>
      Math.min(relevanceScore(a.displayCode, query), relevanceScore(a.title, query))
      - Math.min(relevanceScore(b.displayCode, query), relevanceScore(b.title, query)),
    )
    .slice(0, limit);

  const projects = projectRows
    .map((project) => ({ ...project, type: 'project' as const }))
    .sort((a, b) =>
      Math.min(relevanceScore(a.key, query), relevanceScore(a.name, query))
      - Math.min(relevanceScore(b.key, query), relevanceScore(b.name, query)),
    )
    .slice(0, limit);

  const members = memberRows
    .map((row) => ({
      id: row.user.id,
      membershipId: row.id,
      type: 'member' as const,
      fullName: row.user.fullName,
      username: row.user.username,
      email: row.user.email,
      avatarUrl: row.user.avatarUrl,
      role: row.role,
    }))
    .sort((a, b) =>
      Math.min(
        relevanceScore(a.fullName, query),
        relevanceScore(a.username, query),
        relevanceScore(a.email ?? '', query),
      )
      - Math.min(
        relevanceScore(b.fullName, query),
        relevanceScore(b.username, query),
        relevanceScore(b.email ?? '', query),
      ),
    )
    .slice(0, limit);

  return {
    query,
    results: { tasks, projects, members },
    counts: { tasks: tasks.length, projects: projects.length, members: members.length },
  };
}
