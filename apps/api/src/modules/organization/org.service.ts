import { prisma, MemberStatus } from '@repo/database';
import { AppError } from '../../common/errors';
import { OrgRole } from '@repo/permissions';
import { randomBytes } from 'crypto';
import { createNotification } from '../notification/notification.service';

/**
 * Lấy thông tin chi tiết tổ chức
 */
export async function getOrganization(orgId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
  });
  if (!org) {
    throw new AppError(404, 'ORGANIZATION_NOT_FOUND', 'Không tìm thấy tổ chức.');
  }
  return org;
}

/**
 * Lấy thông tin tổ chức qua Slug
 */
export async function getOrganizationBySlug(slug: string) {
  const org = await prisma.organization.findUnique({
    where: { slug },
  });
  if (!org) {
    throw new AppError(404, 'ORGANIZATION_NOT_FOUND', 'Không tìm thấy tổ chức.');
  }
  return org;
}

/**
 * Cập nhật thông tin chung của tổ chức
 */
export async function updateOrganization(orgId: string, name: string, slug: string) {
  if (slug) {
    const existing = await prisma.organization.findUnique({
      where: { slug },
    });
    if (existing && existing.id !== orgId) {
      throw new AppError(400, 'SLUG_TAKEN', 'Đường dẫn định danh này đã được sử dụng.');
    }
  }

  return prisma.organization.update({
    where: { id: orgId },
    data: { name, slug },
  });
}

/**
 * Lấy danh sách toàn bộ thành viên trong tổ chức
 */
export async function getMembers(orgId: string) {
  const members = await prisma.organizationMember.findMany({
    where: { organizationId: orgId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          fullName: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: {
      joinedAt: 'asc',
    },
  });

  const invitations = await prisma.organizationInvitation.findMany({
    where: { organizationId: orgId, status: 'PENDING', expiresAt: { gt: new Date() } },
    include: {
      invitedBy: {
        select: {
          id: true,
          fullName: true,
          username: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return { members, invitations };
}

/**
 * Mời thành viên tham gia tổ chức bằng email
 */
export async function inviteMember(orgId: string, email: string, role: OrgRole, invitedById: string) {
  // Chặn mời thẳng ai đó làm OWNER qua luồng invite
  if (role === 'OWNER') {
    throw new AppError(400, 'CANNOT_INVITE_AS_OWNER', 'Không thể mời trực tiếp làm Owner.');
  }

  // Tìm user theo email hoặc username
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        { username: email }
      ]
    }
  });

  // Xác định email thực tế dùng cho invitation
  let inviteEmail = email;
  if (existingUser) {
    inviteEmail = existingUser.email || `${existingUser.username}@taskflow.local`;
  }

  // Nếu email đã có tài khoản VÀ đã là thành viên → chặn mời trùng
  if (existingUser) {
    const existingMember = await prisma.organizationMember.findFirst({
      where: { organizationId: orgId, userId: existingUser.id },
    });
    if (existingMember) {
      throw new AppError(400, 'ALREADY_MEMBER', 'Người dùng này đã là thành viên của tổ chức.');
    }
  }

  // Chặn mời trùng khi đã có invitation PENDING chưa hết hạn
  const existingInvite = await prisma.organizationInvitation.findFirst({
    where: { organizationId: orgId, email: inviteEmail, status: 'PENDING', expiresAt: { gt: new Date() } },
  });
  if (existingInvite) {
    throw new AppError(400, 'INVITE_ALREADY_SENT', 'Đã gửi lời mời tới người dùng này, đang chờ phản hồi.');
  }

  const token = randomBytes(32).toString('hex');
  const invitation = await prisma.organizationInvitation.create({
    data: {
      organizationId: orgId,
      email: inviteEmail,
      invitedRole: role,
      invitedById,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 ngày
    },
  });

  // Gửi thông báo in-app nếu user được mời đã tồn tại
  if (existingUser) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    });
    const orgName = org?.name || 'một tổ chức';
    
    await createNotification(
      existingUser.id,
      'ORG_INVITE',
      'Lời mời tham gia tổ chức',
      `Bạn được mời tham gia tổ chức ${orgName}`,
      { token, orgId }
    );
  }

  return invitation;
}

/**
 * Thay đổi vai trò của thành viên trong tổ chức
 */
export async function updateMemberRole(orgId: string, memberId: string, role: OrgRole) {
  const member = await prisma.organizationMember.findFirst({
    where: { id: memberId, organizationId: orgId },
  });
  if (!member) {
    throw new AppError(404, 'MEMBER_NOT_FOUND', 'Không tìm thấy thành viên trong tổ chức này.');
  }

  if (member.role === 'OWNER') {
    throw new AppError(400, 'CANNOT_CHANGE_OWNER_ROLE', 'Không thể thay đổi quyền hạn của Owner.');
  }

  if (role === 'OWNER') {
    throw new AppError(400, 'CANNOT_PROMOTE_TO_OWNER', 'Đổi Owner phải qua chức năng Transfer Ownership riêng.');
  }

  return prisma.organizationMember.update({
    where: { id: memberId },
    data: { role },
  });
}

/**
 * Xóa thành viên khỏi tổ chức
 */
export async function removeMember(orgId: string, memberId: string) {
  const member = await prisma.organizationMember.findFirst({
    where: { id: memberId, organizationId: orgId },
  });
  if (!member) {
    throw new AppError(404, 'MEMBER_NOT_FOUND', 'Không tìm thấy thành viên trong tổ chức này.');
  }

  if (member.role === 'OWNER') {
    throw new AppError(400, 'CANNOT_REMOVE_OWNER', 'Không thể xóa Owner khỏi tổ chức.');
  }

  return prisma.organizationMember.update({
    where: { id: memberId },
    data: { status: 'SUSPENDED' },
  });
}

/**
 * Thay đổi trạng thái hoạt động của thành viên
 */
export async function updateMemberStatus(orgId: string, memberId: string, status: MemberStatus) {
  const member = await prisma.organizationMember.findFirst({
    where: { id: memberId, organizationId: orgId },
  });
  if (!member) {
    throw new AppError(404, 'MEMBER_NOT_FOUND', 'Không tìm thấy thành viên trong tổ chức này.');
  }

  if (member.role === 'OWNER' && status !== 'ACTIVE') {
    throw new AppError(400, 'CANNOT_SUSPEND_OWNER', 'Không thể khóa tài khoản của Owner.');
  }

  return prisma.organizationMember.update({
    where: { id: memberId },
    data: { status },
  });
}



/**
 * Lấy danh sách các tổ chức user tham gia
 */
export async function getUserOrganizations(userId: string) {
  const memberships = await prisma.organizationMember.findMany({
    where: { userId },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          avatarUrl: true,
          members: {
            where: { role: 'OWNER' },
            select: { user: { select: { fullName: true } } },
            take: 1,
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
      },
    },
  });

  return memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug,
    avatarUrl: m.organization.avatarUrl,
    userRole: m.role,
    membersCount: m.organization._count.members,
    ownerName: m.organization.members[0]?.user.fullName || 'Unknown',
  }));
}

export async function createOrganization(
  creatorId: string,
  name: string,
  slug: string,
  avatarUrl?: string
) {
  const existing = await prisma.organization.findUnique({
    where: { slug },
  });
  if (existing) {
    throw new AppError(400, 'SLUG_TAKEN', 'Đường dẫn định danh này đã được sử dụng.');
  }

  const org = await prisma.organization.create({
    data: {
      name,
      slug,
      avatarUrl: avatarUrl || null,
    },
  });

  // Gán người quản lý làm OWNER
  await prisma.organizationMember.create({
    data: {
      organizationId: org.id,
      userId: creatorId,
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });

  return org;
}

/**
 * Lấy thông tin chi tiết lời mời bằng token
 */
export async function getInvitationByToken(token: string) {
  const invitation = await prisma.organizationInvitation.findUnique({
    where: { token },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      invitedBy: {
        select: {
          fullName: true,
        },
      },
    },
  });

  if (!invitation) {
    throw new AppError(404, 'INVITATION_NOT_FOUND', 'Không tìm thấy lời mời.');
  }

  return invitation;
}

/**
 * Chấp nhận lời mời tham gia tổ chức
 */
export async function acceptInvitation(token: string, userId: string) {
  const invitation = await prisma.organizationInvitation.findUnique({
    where: { token },
  });

  if (!invitation) {
    throw new AppError(404, 'INVITATION_NOT_FOUND', 'Không tìm thấy lời mời.');
  }

  if (invitation.status !== 'PENDING') {
    throw new AppError(400, 'INVITATION_NOT_PENDING', 'Lời mời đã được xử lý hoặc không còn hiệu lực.');
  }

  if (invitation.expiresAt < new Date()) {
    await prisma.organizationInvitation.update({
      where: { id: invitation.id },
      data: { status: 'EXPIRED' },
    });
    throw new AppError(400, 'INVITATION_EXPIRED', 'Lời mời đã hết hạn.');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'Không tìm thấy người dùng.');
  }

  const userHasNoEmail = !user.email;

  if (user.email && user.email !== invitation.email) {
    throw new AppError(403, 'EMAIL_MISMATCH', 'Email của bạn không khớp với email được mời.');
  }

  // Thực hiện trong một transaction
  const resultMember = await prisma.$transaction(async (tx) => {
    if (userHasNoEmail) {
      const emailExists = await tx.user.findUnique({
        where: { email: invitation.email },
      });
      if (emailExists) {
        throw new AppError(400, 'EMAIL_ALREADY_TAKEN', 'Email của lời mời đã được sử dụng bởi tài khoản khác.');
      }
      await tx.user.update({
        where: { id: userId },
        data: { email: invitation.email },
      });
    }

    // 1. Cập nhật trạng thái invitation thành ACCEPTED
    await tx.organizationInvitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED' },
    });

    // 2. Tạo bản ghi OrganizationMember
    const member = await tx.organizationMember.create({
      data: {
        organizationId: invitation.organizationId,
        userId,
        role: invitation.invitedRole,
        status: 'ACTIVE',
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return member;
  });

  // Gửi thông báo cho OWNER và ADMIN của tổ chức
  try {
    const newlyJoinedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, username: true },
    });

    const ownersAndAdmins = await prisma.organizationMember.findMany({
      where: {
        organizationId: invitation.organizationId,
        role: { in: ['OWNER', 'ADMIN'] },
        userId: { not: userId },
      },
      select: { userId: true },
    });

    const userName = newlyJoinedUser?.fullName || newlyJoinedUser?.username || 'Thành viên mới';
    const orgName = resultMember.organization.name;

    for (const target of ownersAndAdmins) {
      await createNotification(
        target.userId,
        'GENERAL',
        'Thành viên mới gia nhập',
        `${userName} vừa chấp nhận lời mời và chính thức gia nhập tổ chức ${orgName}.`,
        {
          orgId: invitation.organizationId,
          orgSlug: resultMember.organization.slug,
          memberId: resultMember.id,
          userId,
        }
      );
    }
  } catch (err) {
    console.error('Error sending member joined notification:', err);
  }

  return resultMember;
}

/**
 * Từ chối lời mời tham gia tổ chức
 */
export async function declineInvitation(token: string, userId: string) {
  const invitation = await prisma.organizationInvitation.findUnique({
    where: { token },
  });

  if (!invitation) {
    throw new AppError(404, 'INVITATION_NOT_FOUND', 'Không tìm thấy lời mời.');
  }

  if (invitation.status !== 'PENDING') {
    throw new AppError(400, 'INVITATION_NOT_PENDING', 'Lời mời đã được xử lý hoặc không còn hiệu lực.');
  }

  if (invitation.expiresAt < new Date()) {
    await prisma.organizationInvitation.update({
      where: { id: invitation.id },
      data: { status: 'EXPIRED' },
    });
    throw new AppError(400, 'INVITATION_EXPIRED', 'Lời mời đã hết hạn.');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user || user.email !== invitation.email) {
    throw new AppError(403, 'EMAIL_MISMATCH', 'Email của bạn không khớp với email được mời.');
  }

  return prisma.organizationInvitation.update({
    where: { id: invitation.id },
    data: { status: 'DECLINED' },
  });
}


/**
 * Thống kê tổng quan tổ chức
 */
export async function getOrganizationStats(orgId: string) {
  const projectsCount = await prisma.project.count({
    where: { organizationId: orgId },
  });

  const membersCount = await prisma.organizationMember.count({
    where: { organizationId: orgId },
  });

  const tasksCount = await prisma.task.count({
    where: {
      project: {
        organizationId: orgId,
      },
    },
  });

  return {
    projectsCount,
    membersCount,
    tasksCount,
  };
}

export async function getMyTasksInOrg(orgId: string, userId: string, filters?: { projectId?: string; priority?: string }) {
  const whereCondition: any = {
    assigneeId: userId,
    project: {
      organizationId: orgId,
    },
  };

  if (filters?.projectId) {
    whereCondition.projectId = filters.projectId;
  }

  if (filters?.priority) {
    whereCondition.priority = filters.priority;
  }

  return prisma.task.findMany({
    where: whereCondition,
    include: {
      project: {
        select: {
          id: true,
          name: true,
          key: true,
        },
      },
      assignee: {
        select: {
          id: true,
          fullName: true,
          username: true,
          avatarUrl: true,
        },
      },
      _count: {
        select: {
          comments: true,
          attachments: true,
        },
      },
    },
    orderBy: {
      position: 'asc',
    },
  });
}

/**
 * Lấy dữ liệu tổng quan (Dashboard Summary) của tổ chức cho user hiện tại
 */
export async function getDashboardSummary(orgId: string, userId: string) {
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
  startOfWeek.setHours(0, 0, 0, 0);

  const totalProjects = await prisma.project.count({
    where: { organizationId: orgId },
  });

  const dueSoonTasksCount = await prisma.task.count({
    where: {
      assigneeId: userId,
      project: { organizationId: orgId },
      dueDate: { gte: now, lte: sevenDaysLater },
      status: { not: 'DONE' },
    },
  });

  const overdueTasksCount = await prisma.task.count({
    where: {
      assigneeId: userId,
      project: { organizationId: orgId },
      dueDate: { lt: now },
      status: { not: 'DONE' },
    },
  });

  const completedThisWeekCount = await prisma.task.count({
    where: {
      assigneeId: userId,
      project: { organizationId: orgId },
      status: 'DONE',
      updatedAt: { gte: startOfWeek },
    },
  });

  const upcomingTasks = await prisma.task.findMany({
    where: {
      assigneeId: userId,
      project: { organizationId: orgId },
      status: { not: 'DONE' },
      dueDate: { not: null },
    },
    orderBy: { dueDate: 'asc' },
    take: 5,
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      dueDate: true,
      project: {
        select: {
          id: true,
          key: true,
          name: true,
        },
      },
    },
  });

  const projects = await prisma.project.findMany({
    where: { organizationId: orgId },
    select: {
      id: true,
      key: true,
      name: true,
      tasks: {
        select: {
          status: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  const projectsProgress = projects.map((p) => {
    const total = p.tasks.length;
    const done = p.tasks.filter((t) => t.status === 'DONE').length;
    const progressPercentage = total > 0 ? Math.round((done / total) * 100) : 0;
    return {
      id: p.id,
      key: p.key,
      name: p.name,
      totalTasks: total,
      doneTasks: done,
      progressPercentage,
    };
  });

  return {
    metrics: {
      totalProjects,
      dueSoonTasksCount,
      overdueTasksCount,
      completedThisWeekCount,
    },
    upcomingTasks,
    projectsProgress,
  };
}

export async function resendInvitation(orgId: string, invitationId: string) {
  const invitation = await prisma.organizationInvitation.findFirst({
    where: { id: invitationId, organizationId: orgId, status: 'PENDING' },
  });
  if (!invitation) {
    throw new AppError(404, 'INVITATION_NOT_FOUND', 'Không tìm thấy lời mời.');
  }

  const updated = await prisma.organizationInvitation.update({
    where: { id: invitationId },
    data: {
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return updated;
}
