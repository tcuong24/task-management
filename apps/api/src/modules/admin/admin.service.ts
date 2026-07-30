import { Prisma } from '@repo/database';
import { prisma } from '@repo/database';
import { AppError } from '../../common/errors';

const userSummarySelect = {
  id: true,
  username: true,
  email: true,
  fullName: true,
  avatarUrl: true,
  platformRole: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
  suspendedAt: true,
  suspendReason: true,
  _count: { select: { memberships: true } },
} satisfies Prisma.UserSelect;

export interface UserFilters {
  search?: string;
  status?: 'ACTIVE' | 'SUSPENDED';
  platformRole?: 'USER' | 'ADMIN';
  page: number;
  pageSize: number;
}

export interface AuditLogFilters {
  actorId?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page: number;
  pageSize: number;
}

export interface OrganizationFilters {
  search?: string;
  status?: 'ACTIVE' | 'SUSPENDED' | 'PENDING_DELETION';
  page: number;
  pageSize: number;
}

export async function getOverview() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    totalUsers,
    activeUsers,
    totalOrganizations,
    activeOrganizations,
    newUsersLast7Days,
    suspendedOrganizations,
    suspendedUsers,
    recentActivity,
  ] = await prisma.$transaction([
    prisma.user.count(),
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.organization.count(),
    prisma.organization.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.organization.count({ where: { status: 'SUSPENDED' } }),
    prisma.user.count({ where: { status: 'SUSPENDED' } }),
    prisma.platformAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        action: true,
        targetType: true,
        targetId: true,
        createdAt: true,
        actor: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    }),
  ]);

  return {
    totalUsers,
    activeUsers,
    totalOrganizations,
    activeOrganizations,
    newUsersLast7Days,
    suspendedOrganizations,
    suspendedUsers,
    recentActivity,
  };
}

export async function getUsers(filters: UserFilters) {
  const where: Prisma.UserWhereInput = {};

  if (filters.search) {
    where.OR = [
      { email: { contains: filters.search, mode: 'insensitive' } },
      { username: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  if (filters.status) where.status = filters.status;
  if (filters.platformRole) where.platformRole = filters.platformRole;

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: userSummarySelect,
      orderBy: { createdAt: 'desc' },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users: users.map(({ _count, ...user }) => ({
      ...user,
      organizationCount: _count.memberships,
    })),
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      total,
    },
  };
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...userSummarySelect,
      isVerified: true,
      suspendedBy: true,
      memberships: {
        orderBy: { joinedAt: 'desc' },
        select: {
          id: true,
          role: true,
          status: true,
          joinedAt: true,
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              avatarUrl: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'Không tìm thấy người dùng.');
  }

  const { _count, ...result } = user;
  const suspendedByUser = result.suspendedBy
    ? await prisma.user.findUnique({
        where: { id: result.suspendedBy },
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
        },
      })
    : null;

  return {
    ...result,
    suspendedByUser,
    organizationCount: _count.memberships,
  };
}

export async function suspendUser(
  userId: string,
  actorId: string,
  reason: string,
  ipAddress?: string,
) {
  if (userId === actorId) {
    throw new AppError(
      400,
      'CANNOT_SUSPEND_SELF',
      'Platform Admin không thể tự khóa tài khoản của mình.',
    );
  }

  return prisma.$transaction(async (tx) => {
    const current = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true, suspendedAt: true, suspendReason: true },
    });
    if (!current) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Không tìm thấy người dùng.');
    }
    if (current.status === 'SUSPENDED') {
      throw new AppError(409, 'USER_ALREADY_SUSPENDED', 'Tài khoản đã bị khóa.');
    }

    const now = new Date();
    const updated = await tx.user.update({
      where: { id: userId },
      data: {
        status: 'SUSPENDED',
        suspendedAt: now,
        suspendedBy: actorId,
        suspendReason: reason,
        refreshTokens: {
          updateMany: {
            where: { revokedAt: null },
            data: { revokedAt: now },
          },
        },
      },
      select: userSummarySelect,
    });

    await tx.platformAuditLog.create({
      data: {
        actorId,
        action: 'USER_SUSPENDED',
        targetType: 'USER',
        targetId: userId,
        reason,
        oldValue: { status: current.status },
        newValue: { status: updated.status },
        ipAddress,
      },
    });

    const { _count, ...result } = updated;
    return { ...result, organizationCount: _count.memberships };
  });
}

export async function restoreUser(
  userId: string,
  actorId: string,
  reason: string,
  ipAddress?: string,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true, suspendReason: true },
    });
    if (!current) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Không tìm thấy người dùng.');
    }
    if (current.status === 'ACTIVE') {
      throw new AppError(409, 'USER_ALREADY_ACTIVE', 'Tài khoản đang hoạt động.');
    }

    const updated = await tx.user.update({
      where: { id: userId },
      data: {
        status: 'ACTIVE',
        suspendedAt: null,
        suspendedBy: null,
        suspendReason: null,
      },
      select: userSummarySelect,
    });

    await tx.platformAuditLog.create({
      data: {
        actorId,
        action: 'USER_RESTORED',
        targetType: 'USER',
        targetId: userId,
        reason,
        oldValue: { status: current.status, reason: current.suspendReason },
        newValue: { status: updated.status },
        ipAddress,
      },
    });

    const { _count, ...result } = updated;
    return { ...result, organizationCount: _count.memberships };
  });
}

export async function getOrganizations(filters: OrganizationFilters) {
  const where: Prisma.OrganizationWhereInput = {};
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { slug: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  if (filters.status) where.status = filters.status;

  const [organizations, total] = await prisma.$transaction([
    prisma.organization.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      select: {
        id: true,
        name: true,
        slug: true,
        avatarUrl: true,
        status: true,
        createdAt: true,
        members: {
          where: { role: 'OWNER' },
          take: 1,
          select: {
            user: {
              select: { id: true, username: true, email: true, fullName: true },
            },
          },
        },
        _count: { select: { members: true, projects: true } },
      },
    }),
    prisma.organization.count({ where }),
  ]);

  return {
    organizations: organizations.map(({ members, _count, ...organization }) => ({
      ...organization,
      owner: members[0]?.user ?? null,
      memberCount: _count.members,
      projectCount: _count.projects,
    })),
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      total,
    },
  };
}

export async function getOrganizationById(organizationId: string) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      avatarUrl: true,
      status: true,
      suspendedAt: true,
      suspendedBy: true,
      suspendReason: true,
      deletedAt: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { members: true, projects: true } },
      members: {
        orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
        select: {
          id: true,
          role: true,
          status: true,
          joinedAt: true,
          user: {
            select: { id: true, username: true, email: true, fullName: true },
          },
        },
      },
      projects: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          key: true,
          status: true,
          taskCounter: true,
          createdAt: true,
        },
      },
    },
  });

  if (!organization) {
    throw new AppError(
      404,
      'ORGANIZATION_NOT_FOUND',
      'Không tìm thấy tổ chức.',
    );
  }

  const suspendedByUser = organization.suspendedBy
    ? await prisma.user.findUnique({
        where: { id: organization.suspendedBy },
        select: { id: true, username: true, email: true, fullName: true },
      })
    : null;
  const owner =
    organization.members.find((member) => member.role === 'OWNER')?.user ?? null;
  const { _count, ...result } = organization;
  return {
    ...result,
    owner,
    suspendedByUser,
    memberCount: _count.members,
    projectCount: _count.projects,
  };
}

export async function suspendOrganization(
  organizationId: string,
  actorId: string,
  reason: string,
  ipAddress?: string,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, status: true },
    });
    if (!current) {
      throw new AppError(
        404,
        'ORGANIZATION_NOT_FOUND',
        'Không tìm thấy tổ chức.',
      );
    }
    if (current.status !== 'ACTIVE') {
      throw new AppError(
        409,
        'ORGANIZATION_NOT_ACTIVE',
        'Chỉ có thể khóa tổ chức đang hoạt động.',
      );
    }

    const updated = await tx.organization.update({
      where: { id: organizationId },
      data: {
        status: 'SUSPENDED',
        suspendedAt: new Date(),
        suspendedBy: actorId,
        suspendReason: reason,
      },
    });

    await tx.platformAuditLog.create({
      data: {
        actorId,
        action: 'SUSPEND_ORG',
        targetType: 'ORGANIZATION',
        targetId: organizationId,
        reason,
        oldValue: { status: current.status },
        newValue: { status: updated.status },
        ipAddress,
      },
    });

    return updated;
  });
}

export async function restoreOrganization(
  organizationId: string,
  actorId: string,
  reason: string,
  ipAddress?: string,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, status: true, suspendReason: true },
    });
    if (!current) {
      throw new AppError(
        404,
        'ORGANIZATION_NOT_FOUND',
        'Không tìm thấy tổ chức.',
      );
    }
    if (current.status !== 'SUSPENDED') {
      throw new AppError(
        409,
        'ORGANIZATION_NOT_SUSPENDED',
        'Chỉ có thể khôi phục tổ chức đang bị khóa.',
      );
    }

    const updated = await tx.organization.update({
      where: { id: organizationId },
      data: {
        status: 'ACTIVE',
        suspendedAt: null,
        suspendedBy: null,
        suspendReason: null,
        deletedAt: null,
      },
    });

    await tx.platformAuditLog.create({
      data: {
        actorId,
        action: 'RESTORE_ORG',
        targetType: 'ORGANIZATION',
        targetId: organizationId,
        reason,
        oldValue: { status: current.status, reason: current.suspendReason },
        newValue: { status: updated.status },
        ipAddress,
      },
    });

    return updated;
  });
}

export async function getAuditLogs(filters: AuditLogFilters) {
  const where: Prisma.PlatformAuditLogWhereInput = {};
  if (filters.actorId) where.actorId = filters.actorId;
  if (filters.action) where.action = filters.action;
  if (filters.targetType) where.targetType = filters.targetType;
  if (filters.targetId) where.targetId = filters.targetId;
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {
      ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
      ...(filters.dateTo ? { lte: filters.dateTo } : {}),
    };
  }

  const [logs, total] = await prisma.$transaction([
    prisma.platformAuditLog.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      include: {
        actor: {
          select: { id: true, username: true, email: true, fullName: true },
        },
      },
    }),
    prisma.platformAuditLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      total,
    },
  };
}

const SETTING_DEFAULTS = {
  invitation_expiry_days: 7,
  max_upload_size_mb: 50,
  allowed_file_types: ['image/png', 'image/jpeg', 'application/pdf'],
  maintenance_mode: false,
} as const;

type SettingKey = keyof typeof SETTING_DEFAULTS;

function validateSetting(key: string, value: unknown): asserts key is SettingKey {
  if (!(key in SETTING_DEFAULTS)) {
    throw new AppError(400, 'UNKNOWN_SETTING', 'Key cấu hình không được hỗ trợ.');
  }
  if (
    (key === 'invitation_expiry_days' || key === 'max_upload_size_mb') &&
    (typeof value !== 'number' || !Number.isInteger(value) || value < 1)
  ) {
    throw new AppError(400, 'INVALID_SETTING_VALUE', 'Giá trị phải là số nguyên dương.');
  }
  if (
    key === 'allowed_file_types' &&
    (!Array.isArray(value) || value.some((item) => typeof item !== 'string'))
  ) {
    throw new AppError(400, 'INVALID_SETTING_VALUE', 'Loại file phải là mảng chuỗi.');
  }
  if (key === 'maintenance_mode' && typeof value !== 'boolean') {
    throw new AppError(400, 'INVALID_SETTING_VALUE', 'Maintenance mode phải là boolean.');
  }
}

export async function getPlatformSettings() {
  const rows = await prisma.platformSetting.findMany();
  return rows.reduce<Record<string, unknown>>(
    (settings, row) => ({ ...settings, [row.key]: row.value }),
    { ...SETTING_DEFAULTS },
  );
}

export async function updatePlatformSetting(
  key: string,
  value: unknown,
  actorId: string,
  ipAddress?: string,
) {
  validateSetting(key, value);
  return prisma.$transaction(async (tx) => {
    const current = await tx.platformSetting.findUnique({ where: { key } });
    const oldValue = current?.value ?? SETTING_DEFAULTS[key];
    const setting = await tx.platformSetting.upsert({
      where: { key },
      create: { key, value: value as Prisma.InputJsonValue, updatedBy: actorId },
      update: { value: value as Prisma.InputJsonValue, updatedBy: actorId },
    });
    await tx.platformAuditLog.create({
      data: {
        actorId,
        action: 'UPDATE_SETTING',
        targetType: 'SETTING',
        targetId: key,
        oldValue: { value: oldValue } as Prisma.InputJsonValue,
        newValue: { value } as Prisma.InputJsonValue,
        ipAddress,
      },
    });
    return setting;
  });
}

export async function getSystemHealth() {
  const now = new Date();
  const since = new Date(now);
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - 6);

  let database: { status: 'ok' | 'error'; message: string };
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = { status: 'ok', message: 'Kết nối bình thường' };
  } catch {
    database = { status: 'error', message: 'Không thể kết nối database' };
  }

  const redis = {
    configured: false,
    status: null,
    message: 'Chưa cấu hình',
  };

  if (database.status === 'error') {
    return {
      database,
      redis,
      activity: null,
      expiredRefreshTokens: null,
      largeAttachments: null,
      attachmentThresholdMb: 50,
    };
  }

  const [tasks, projects, expiredRefreshTokens, configuredSize, attachments] =
    await Promise.all([
      prisma.task.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      prisma.project.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      prisma.refreshToken.count({
        where: { expiresAt: { lt: now }, revokedAt: null },
      }),
      prisma.platformSetting.findUnique({ where: { key: 'max_upload_size_mb' } }),
      prisma.attachment.findMany({
        where: { sizeBytes: { not: null } },
        orderBy: { sizeBytes: 'desc' },
        take: 100,
        select: {
          id: true,
          originalName: true,
          sizeBytes: true,
          uploadedAt: true,
          uploader: {
            select: { id: true, username: true, email: true, fullName: true },
          },
        },
      }),
    ]);

  const sizeValue = configuredSize?.value;
  const attachmentThresholdMb =
    typeof sizeValue === 'number' && sizeValue > 0 ? sizeValue : 50;
  const thresholdBytes = BigInt(attachmentThresholdMb * 1024 * 1024);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(since);
    date.setUTCDate(date.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
  const activity = days.map((date) => ({
    date,
    tasks: tasks.filter((item) => item.createdAt.toISOString().startsWith(date)).length,
    projects: projects.filter((item) =>
      item.createdAt.toISOString().startsWith(date),
    ).length,
  }));

  return {
    database,
    redis,
    activity,
    expiredRefreshTokens,
    attachmentThresholdMb,
    largeAttachments: attachments
      .filter((item) => item.sizeBytes! > thresholdBytes)
      .slice(0, 10),
  };
}
