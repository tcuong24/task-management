import { prisma, MemberStatus } from "@repo/database";
import { AppError } from "../../common/errors";
import { OrgRole } from "@repo/permissions";
import { randomBytes } from "crypto";
import { createNotification } from "../notification/notification.service";
import { logActivity } from "../../common/services/activityLog.service";
import { getPlatformSetting } from "../../common/services/platformSetting.service";

/**
 * Lấy thông tin chi tiết tổ chức
 */
export async function getOrganization(orgId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
  });
  if (!org || org.deletedAt) {
    throw new AppError(
      404,
      "ORGANIZATION_NOT_FOUND",
      "Không tìm thấy tổ chức.",
    );
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
  if (!org || org.deletedAt) {
    throw new AppError(
      404,
      "ORGANIZATION_NOT_FOUND",
      "Không tìm thấy tổ chức.",
    );
  }
  return org;
}

/**
 * Cập nhật thông tin chung của tổ chức
 */
export async function updateOrganization(
  orgId: string,
  name: string,
  slug: string,
) {
  if (slug) {
    const existing = await prisma.organization.findUnique({
      where: { slug },
    });
    if (existing && existing.id !== orgId) {
      throw new AppError(
        400,
        "SLUG_TAKEN",
        "Đường dẫn định danh này đã được sử dụng.",
      );
    }
  }

  return prisma.organization.update({
    where: { id: orgId },
    data: { name, slug },
  });
}

export async function deleteOrganization(orgId: string) {
  const result = await prisma.organization.updateMany({
    where: { id: orgId, deletedAt: null },
    data: { deletedAt: new Date(), status: "PENDING_DELETION" },
  });

  if (result.count === 0) {
    throw new AppError(
      404,
      "ORGANIZATION_NOT_FOUND",
      "Không tìm thấy tổ chức.",
    );
  }
}

/**
 * Lấy danh sách toàn bộ thành viên trong tổ chức
 */
export async function getOrganizationActivities(orgId: string, limit = 20) {
  const logs = await prisma.activityLog.findMany({
    where: { organizationId: orgId },
    include: {
      actor: {
        select: { id: true, fullName: true, username: true, avatarUrl: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: Number(limit) || 20,
  });

  const taskIds = logs
    .filter((l) => l.entityType === "TASK" && !(l.metadata as any)?.projectKey)
    .map((l) => l.entityId);

  const projectIds = logs
    .filter(
      (l) => l.entityType === "PROJECT" && !(l.metadata as any)?.projectKey,
    )
    .map((l) => l.entityId);

  const tasks =
    taskIds.length > 0
      ? await prisma.task.findMany({
          where: { id: { in: taskIds } },
          select: {
            id: true,
            title: true,
            taskNumber: true,
            project: { select: { key: true, name: true } },
          },
        })
      : [];
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  const projects =
    projectIds.length > 0
      ? await prisma.project.findMany({
          where: { id: { in: projectIds } },
          select: { id: true, key: true, name: true },
        })
      : [];
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  return logs.map((l) => {
    const meta = { ...((l.metadata as Record<string, any>) || {}) };
    if (!meta.projectKey) {
      if (l.entityType === "TASK" && taskMap.has(l.entityId)) {
        const taskInfo = taskMap.get(l.entityId)!;
        meta.projectKey = taskInfo.project.key;
        meta.projectName = meta.projectName || taskInfo.project.name;
        meta.taskTitle = meta.taskTitle || taskInfo.title;
        meta.taskNumber = meta.taskNumber || taskInfo.taskNumber;
      } else if (l.entityType === "PROJECT" && projectMap.has(l.entityId)) {
        const projInfo = projectMap.get(l.entityId)!;
        meta.projectKey = projInfo.key;
        meta.projectName = meta.projectName || projInfo.name;
      }
    }
    return {
      ...l,
      metadata: meta,
    };
  });
}

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
      joinedAt: "asc",
    },
  });

  const invitations = await prisma.organizationInvitation.findMany({
    where: {
      organizationId: orgId,
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
    include: {
      invitedBy: {
        select: {
          id: true,
          fullName: true,
          username: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return { members, invitations };
}

/**
 * Mời thành viên tham gia tổ chức bằng email
 */
export async function inviteMember(
  orgId: string,
  email: string,
  role: OrgRole,
  invitedById: string,
) {
  // Chặn mời thẳng ai đó làm OWNER qua luồng invite
  if (role === "OWNER") {
    throw new AppError(
      400,
      "CANNOT_INVITE_AS_OWNER",
      "Không thể mời trực tiếp làm Owner.",
    );
  }

  // Tìm user theo email hoặc username
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username: email }],
    },
  });

  // Xác định email thực tế dùng cho invitation
  let inviteEmail = email;
  if (existingUser) {
    inviteEmail =
      existingUser.email || `${existingUser.username}@taskflow.local`;
  }

  // Nếu email đã có tài khoản VÀ đã là thành viên → chặn mời trùng
  if (existingUser) {
    const existingMember = await prisma.organizationMember.findFirst({
      where: { organizationId: orgId, userId: existingUser.id },
    });
    if (existingMember) {
      throw new AppError(
        400,
        "ALREADY_MEMBER",
        "Người dùng này đã là thành viên của tổ chức.",
      );
    }
  }

  // Chặn mời trùng khi đã có invitation PENDING chưa hết hạn
  const existingInvite = await prisma.organizationInvitation.findFirst({
    where: {
      organizationId: orgId,
      email: inviteEmail,
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
  });
  if (existingInvite) {
    throw new AppError(
      400,
      "INVITE_ALREADY_SENT",
      "Đã gửi lời mời tới người dùng này, đang chờ phản hồi.",
    );
  }

  const token = randomBytes(32).toString("hex");
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
    const orgName = org?.name || "một tổ chức";

    await createNotification(
      existingUser.id,
      "ORG_INVITE",
      "Lời mời tham gia tổ chức",
      `Bạn được mời tham gia tổ chức ${orgName}`,
      { token, orgId },
    );
  }

  logActivity({
    organizationId: orgId,
    entityType: "MEMBER",
    entityId: invitation.id,
    actorId: invitedById,
    action: "member_invited",
    metadata: {
      email: inviteEmail,
      invitedRole: role,
    },
  });

  return invitation;
}

/**
 * Thay đổi vai trò của thành viên trong tổ chức
 */
export async function updateMemberRole(
  orgId: string,
  memberId: string,
  role: OrgRole,
  actorId?: string,
) {
  const member = await prisma.organizationMember.findFirst({
    where: { id: memberId, organizationId: orgId },
    include: { user: { select: { fullName: true, username: true } } },
  });
  if (!member) {
    throw new AppError(
      404,
      "MEMBER_NOT_FOUND",
      "Không tìm thấy thành viên trong tổ chức này.",
    );
  }

  if (member.role === "OWNER") {
    throw new AppError(
      400,
      "CANNOT_CHANGE_OWNER_ROLE",
      "Không thể thay đổi quyền hạn của Owner.",
    );
  }

  if (role === "OWNER") {
    throw new AppError(
      400,
      "CANNOT_PROMOTE_TO_OWNER",
      "Đổi Owner phải qua chức năng Transfer Ownership riêng.",
    );
  }

  const updated = await prisma.organizationMember.update({
    where: { id: memberId },
    data: { role },
  });

  logActivity({
    organizationId: orgId,
    entityType: "MEMBER",
    entityId: memberId,
    actorId: actorId || member.userId,
    action: "role_changed",
    oldValue: member.role,
    newValue: role,
    metadata: {
      memberName:
        member.user?.fullName || member.user?.username || "Thành viên",
      oldRole: member.role,
      newRole: role,
    },
  });

  return updated;
}

/**
 * Xóa thành viên khỏi tổ chức
 */
export async function removeMember(
  orgId: string,
  memberId: string,
  actorId?: string,
) {
  const member = await prisma.organizationMember.findFirst({
    where: { id: memberId, organizationId: orgId },
    include: { user: { select: { fullName: true, username: true } } },
  });
  if (!member) {
    throw new AppError(
      404,
      "MEMBER_NOT_FOUND",
      "Không tìm thấy thành viên trong tổ chức này.",
    );
  }

  if (member.role === "OWNER") {
    throw new AppError(
      400,
      "CANNOT_REMOVE_OWNER",
      "Không thể xóa Owner khỏi tổ chức.",
    );
  }

  const result = await prisma.organizationMember.update({
    where: { id: memberId },
    data: { status: "SUSPENDED" },
  });

  logActivity({
    organizationId: orgId,
    entityType: "MEMBER",
    entityId: memberId,
    actorId: actorId || member.userId,
    action: "member_removed",
    metadata: {
      memberName:
        member.user?.fullName || member.user?.username || "Thành viên",
    },
  });

  return result;
}

/**
 * Thay đổi trạng thái hoạt động của thành viên
 */
export async function updateMemberStatus(
  orgId: string,
  memberId: string,
  status: MemberStatus,
) {
  const member = await prisma.organizationMember.findFirst({
    where: { id: memberId, organizationId: orgId },
  });
  if (!member) {
    throw new AppError(
      404,
      "MEMBER_NOT_FOUND",
      "Không tìm thấy thành viên trong tổ chức này.",
    );
  }

  if (member.role === "OWNER" && status !== "ACTIVE") {
    throw new AppError(
      400,
      "CANNOT_SUSPEND_OWNER",
      "Không thể khóa tài khoản của Owner.",
    );
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
    where: { userId, organization: { deletedAt: null } },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          avatarUrl: true,
          members: {
            where: { role: "OWNER" },
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
    ownerName: m.organization.members[0]?.user.fullName || "Unknown",
  }));
}

export async function createOrganization(
  creatorId: string,
  name: string,
  slug: string,
  avatarUrl?: string,
) {
  const organizationCreationEnabled = await getPlatformSetting(
    "organization_creation_enabled",
  );

  if (!organizationCreationEnabled) {
    throw new AppError(
      403,
      "ORGANIZATION_CREATION_DISABLED",
      "Hệ thống đang tạm dừng tạo tổ chức mới.",
    );
  }

  const existing = await prisma.organization.findUnique({
    where: { slug },
  });
  if (existing) {
    throw new AppError(
      400,
      "SLUG_TAKEN",
      "Đường dẫn định danh này đã được sử dụng.",
    );
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
      role: "OWNER",
      status: "ACTIVE",
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
    throw new AppError(404, "INVITATION_NOT_FOUND", "Không tìm thấy lời mời.");
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
    throw new AppError(404, "INVITATION_NOT_FOUND", "Không tìm thấy lời mời.");
  }

  if (invitation.status !== "PENDING") {
    throw new AppError(
      400,
      "INVITATION_NOT_PENDING",
      "Lời mời đã được xử lý hoặc không còn hiệu lực.",
    );
  }

  if (invitation.expiresAt < new Date()) {
    await prisma.organizationInvitation.update({
      where: { id: invitation.id },
      data: { status: "EXPIRED" },
    });
    throw new AppError(400, "INVITATION_EXPIRED", "Lời mời đã hết hạn.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "Không tìm thấy người dùng.");
  }

  const userHasNoEmail = !user.email;

  if (user.email && user.email !== invitation.email) {
    throw new AppError(
      403,
      "EMAIL_MISMATCH",
      "Email của bạn không khớp với email được mời.",
    );
  }

  // Thực hiện trong một transaction
  const resultMember = await prisma.$transaction(async (tx) => {
    if (userHasNoEmail) {
      const emailExists = await tx.user.findUnique({
        where: { email: invitation.email },
      });
      if (emailExists) {
        throw new AppError(
          400,
          "EMAIL_ALREADY_TAKEN",
          "Email của lời mời đã được sử dụng bởi tài khoản khác.",
        );
      }
      await tx.user.update({
        where: { id: userId },
        data: { email: invitation.email },
      });
    }

    // 1. Cập nhật trạng thái invitation thành ACCEPTED
    await tx.organizationInvitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED" },
    });

    // 2. Tạo bản ghi OrganizationMember
    const member = await tx.organizationMember.create({
      data: {
        organizationId: invitation.organizationId,
        userId,
        role: invitation.invitedRole,
        status: "ACTIVE",
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
        role: { in: ["OWNER", "ADMIN"] },
        userId: { not: userId },
      },
      select: { userId: true },
    });

    const userName =
      newlyJoinedUser?.fullName ||
      newlyJoinedUser?.username ||
      "Thành viên mới";
    const orgName = resultMember.organization.name;

    for (const target of ownersAndAdmins) {
      await createNotification(
        target.userId,
        "GENERAL",
        "Thành viên mới gia nhập",
        `${userName} vừa chấp nhận lời mời và chính thức gia nhập tổ chức ${orgName}.`,
        {
          orgId: invitation.organizationId,
          orgSlug: resultMember.organization.slug,
          memberId: resultMember.id,
          userId,
        },
      );
    }
  } catch (err) {
    console.error("Error sending member joined notification:", err);
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
    throw new AppError(404, "INVITATION_NOT_FOUND", "Không tìm thấy lời mời.");
  }

  if (invitation.status !== "PENDING") {
    throw new AppError(
      400,
      "INVITATION_NOT_PENDING",
      "Lời mời đã được xử lý hoặc không còn hiệu lực.",
    );
  }

  if (invitation.expiresAt < new Date()) {
    await prisma.organizationInvitation.update({
      where: { id: invitation.id },
      data: { status: "EXPIRED" },
    });
    throw new AppError(400, "INVITATION_EXPIRED", "Lời mời đã hết hạn.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user || user.email !== invitation.email) {
    throw new AppError(
      403,
      "EMAIL_MISMATCH",
      "Email của bạn không khớp với email được mời.",
    );
  }

  return prisma.organizationInvitation.update({
    where: { id: invitation.id },
    data: { status: "DECLINED" },
  });
}

/**
 * Thống kê khối lượng công việc theo thành viên trong tổ chức
 */
export async function getOrganizationWorkload(orgId: string) {
  const [workloadRaw, totalTasksCount] = await Promise.all([
    prisma.task.groupBy({
      by: ["assigneeId"],
      where: {
        project: { organizationId: orgId, deletedAt: null },
        deletedAt: null,
        status: { not: "DONE" },
      },
      _count: true,
    }),
    prisma.task.count({
      where: {
        project: { organizationId: orgId, deletedAt: null },
        deletedAt: null,
      },
    }),
  ]);

  const assigneeIds = workloadRaw
    .map((w) => w.assigneeId)
    .filter(Boolean) as string[];
  const users = await prisma.user.findMany({
    where: { id: { in: assigneeIds } },
    select: { id: true, fullName: true, avatarUrl: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const workload = workloadRaw
    .map((w) => ({
      assigneeId: w.assigneeId,
      assigneeName: w.assigneeId
        ? (userMap.get(w.assigneeId)?.fullName ?? "Không rõ")
        : "Chưa phân công",
      avatarUrl: w.assigneeId
        ? (userMap.get(w.assigneeId)?.avatarUrl ?? null)
        : null,
      taskCount: w._count,
    }))
    .sort((a, b) => b.taskCount - a.taskCount);

  return { workload, totalTasksCount };
}

/**
 * Thống kê tổng quan tổ chức
 */
export async function getOrganizationStats(orgId: string) {
  const [projectsCount, membersCount, { workload, totalTasksCount }] =
    await Promise.all([
      prisma.project.count({
        where: { organizationId: orgId, deletedAt: null },
      }),
      prisma.organizationMember.count({ where: { organizationId: orgId } }),
      getOrganizationWorkload(orgId),
    ]);

  return {
    projectsCount,
    membersCount,
    tasksCount: totalTasksCount,
    workload,
  };
}

export async function getMyTasksInOrg(
  orgId: string,
  userId: string,
  filters?: { projectId?: string; priority?: string },
) {
  const whereCondition: any = {
    assigneeId: userId,
    deletedAt: null,
    project: {
      organizationId: orgId,
      deletedAt: null,
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
      position: "asc",
    },
  });
}

/**
 * Lấy dữ liệu tổng quan (Dashboard Summary) của tổ chức cho user hiện tại
 */
export async function getDashboardSummary(orgId: string, _userId: string) {
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const startOfWeek = new Date(now);
  startOfWeek.setDate(
    now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1),
  );
  startOfWeek.setHours(0, 0, 0, 0);

  const totalProjects = await prisma.project.count({
    where: { organizationId: orgId, deletedAt: null },
  });

  const dueSoonTasksCount = await prisma.task.count({
    where: {
      project: { organizationId: orgId, deletedAt: null },
      deletedAt: null,
      dueDate: { gte: now, lte: sevenDaysLater },
      status: { not: "DONE" },
    },
  });

  const overdueTasksCount = await prisma.task.count({
    where: {
      project: { organizationId: orgId, deletedAt: null },
      deletedAt: null,
      dueDate: { lt: now },
      status: { not: "DONE" },
    },
  });

  const completedThisWeekCount = await prisma.task.count({
    where: {
      project: { organizationId: orgId, deletedAt: null },
      deletedAt: null,
      status: "DONE",
      updatedAt: { gte: startOfWeek },
    },
  });

  const blockedOrCriticalCount = await prisma.task.count({
    where: {
      project: { organizationId: orgId, deletedAt: null },
      deletedAt: null,
      priority: "CRITICAL",
      status: { not: "DONE" },
    },
  });

  // Task status breakdown for Donut Chart
  const statusGroup = await prisma.task.groupBy({
    by: ["status"],
    where: {
      project: { organizationId: orgId, deletedAt: null },
      deletedAt: null,
    },
    _count: { id: true },
  });

  const statusBreakdown = {
    TODO: 0,
    IN_PROGRESS: 0,
    IN_REVIEW: 0,
    DONE: 0,
  };
  statusGroup.forEach((item) => {
    if (item.status in statusBreakdown) {
      statusBreakdown[item.status as keyof typeof statusBreakdown] =
        item._count.id;
    }
  });

  // Enhanced project statistics
  const projects = await prisma.project.findMany({
    where: { organizationId: orgId, deletedAt: null },
    select: {
      id: true,
      key: true,
      name: true,
      owner: {
        select: {
          fullName: true,
          avatarUrl: true,
        },
      },
      tasks: {
        where: { deletedAt: null },
        select: {
          id: true,
          status: true,
          dueDate: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const projectsProgress = projects.map((p) => {
    const total = p.tasks.length;
    const done = p.tasks.filter((t) => t.status === "DONE").length;
    const overdueCount = p.tasks.filter(
      (t) => t.status !== "DONE" && t.dueDate && new Date(t.dueDate) < now,
    ).length;
    const progressPercentage = total > 0 ? Math.round((done / total) * 100) : 0;
    return {
      id: p.id,
      key: p.key,
      name: p.name,
      totalTasks: total,
      doneTasks: done,
      progressPercentage,
      overdueCount,
      owner: {
        fullName: p.owner?.fullName || "Chủ dự án",
        avatarUrl: p.owner?.avatarUrl || null,
      },
    };
  });

  // Attention Items
  const overdueTasksRaw = await prisma.task.findMany({
    where: {
      project: { organizationId: orgId, deletedAt: null },
      deletedAt: null,
      status: { not: "DONE" },
      dueDate: { lt: now },
    },
    orderBy: { dueDate: "asc" },
    take: 5,
    select: {
      id: true,
      title: true,
      taskNumber: true,
      dueDate: true,
      priority: true,
      project: { select: { key: true } },
      assignee: { select: { fullName: true, avatarUrl: true } },
    },
  });

  const unassignedTasksRaw = await prisma.task.findMany({
    where: {
      project: { organizationId: orgId, deletedAt: null },
      deletedAt: null,
      status: { not: "DONE" },
      assigneeId: null,
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      title: true,
      taskNumber: true,
      priority: true,
      project: { select: { key: true } },
    },
  });

  const criticalTasksRaw = await prisma.task.findMany({
    where: {
      project: { organizationId: orgId, deletedAt: null },
      deletedAt: null,
      status: { not: "DONE" },
      priority: "CRITICAL",
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      title: true,
      taskNumber: true,
      status: true,
      project: { select: { key: true } },
      assignee: { select: { fullName: true, avatarUrl: true } },
    },
  });

  // Upcoming Deadlines (next 14 days)
  const upcomingDeadlinesRaw = await prisma.task.findMany({
    where: {
      project: { organizationId: orgId, deletedAt: null },
      deletedAt: null,
      status: { not: "DONE" },
      dueDate: { gte: now, lte: fourteenDaysLater },
    },
    orderBy: { dueDate: "asc" },
    take: 8,
    select: {
      id: true,
      title: true,
      taskNumber: true,
      dueDate: true,
      priority: true,
      status: true,
      project: { select: { key: true } },
      assignee: { select: { fullName: true, avatarUrl: true } },
    },
  });

  const { workload, totalTasksCount } = await getOrganizationWorkload(orgId);

  return {
    metrics: {
      totalProjects,
      dueSoonTasksCount,
      overdueTasksCount,
      completedThisWeekCount,
      blockedOrCriticalCount,
    },
    statusBreakdown,
    projectsProgress,
    attentionItems: {
      overdueTasks: overdueTasksRaw.map((t) => ({
        id: t.id,
        title: t.title,
        displayCode: `${t.project.key}-${t.taskNumber}`,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        priority: t.priority,
        projectKey: t.project.key,
        assigneeName: t.assignee?.fullName || "Chưa giao",
        assigneeAvatarUrl: t.assignee?.avatarUrl || null,
      })),
      unassignedTasks: unassignedTasksRaw.map((t) => ({
        id: t.id,
        title: t.title,
        displayCode: `${t.project.key}-${t.taskNumber}`,
        priority: t.priority,
        projectKey: t.project.key,
      })),
      criticalTasks: criticalTasksRaw.map((t) => ({
        id: t.id,
        title: t.title,
        displayCode: `${t.project.key}-${t.taskNumber}`,
        status: t.status,
        projectKey: t.project.key,
        assigneeName: t.assignee?.fullName || "Chưa giao",
      })),
    },
    upcomingDeadlines: upcomingDeadlinesRaw.map((t) => ({
      id: t.id,
      title: t.title,
      displayCode: `${t.project.key}-${t.taskNumber}`,
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      priority: t.priority,
      status: t.status,
      projectKey: t.project.key,
      assigneeName: t.assignee?.fullName || "Chưa giao",
      assigneeAvatarUrl: t.assignee?.avatarUrl || null,
    })),
    workload,
    totalTasksCount,
  };
}

export async function resendInvitation(orgId: string, invitationId: string) {
  const invitation = await prisma.organizationInvitation.findFirst({
    where: { id: invitationId, organizationId: orgId, status: "PENDING" },
  });
  if (!invitation) {
    throw new AppError(404, "INVITATION_NOT_FOUND", "Không tìm thấy lời mời.");
  }

  const updated = await prisma.organizationInvitation.update({
    where: { id: invitationId },
    data: {
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return updated;
}
