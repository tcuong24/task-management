import bcrypt from 'bcrypt';
import cloudinary from '../../config/cloudinary';
import { prisma } from '@repo/database';
import { AppError, UserNotFoundError, InvalidCredentialsError } from '../../common/errors';

const SALT_ROUNDS = 12;

/**
 * Fetch detailed profile of current authenticated user, including active memberships.
 */
export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      fullName: true,
      avatarUrl: true,
      isVerified: true,
      lastLoginAt: true,
      createdAt: true,
      memberships: {
        select: {
          role: true,
          status: true,
          joinedAt: true,
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { joinedAt: 'desc' },
      },
    },
  });

  if (!user) {
    throw new UserNotFoundError();
  }

  return user;
}

/**
 * Update current user profile fields (fullName, avatarUrl, email).
 */
export async function updateMe(
  userId: string,
  data: { fullName?: string; avatarUrl?: string; email?: string },
) {
  const { fullName, avatarUrl, email } = data;

  if (email) {
    const existingEmail = await prisma.user.findFirst({
      where: {
        email,
        id: { not: userId },
      },
    });
    if (existingEmail) {
      throw new AppError(400, 'EMAIL_EXISTS', 'Địa chỉ email này đã được sử dụng bởi tài khoản khác.');
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(fullName !== undefined && { fullName: fullName.trim() }),
      ...(avatarUrl !== undefined && { avatarUrl: avatarUrl ? avatarUrl.trim() : null }),
      ...(email !== undefined && { email: email.trim() }),
    },
    select: {
      id: true,
      username: true,
      email: true,
      fullName: true,
      avatarUrl: true,
      isVerified: true,
      lastLoginAt: true,
    },
  });

  return updatedUser;
}

/**
 * Change current user password with old password verification.
 */
export async function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true },
  });

  if (!user) {
    throw new UserNotFoundError();
  }

  if (!user.passwordHash) {
    throw new AppError(400, 'NO_PASSWORD', 'Tài khoản không có mật khẩu.');
  }

  // Verify old password
  const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!isMatch) {
    throw new InvalidCredentialsError('Mật khẩu cũ không chính xác.');
  }

  // Hash new password using bcrypt SALT_ROUNDS = 12
  const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: newPasswordHash,
    },
  });

  return true;
}

export async function uploadUserAvatar(userId: string, fileBuffer: Buffer, mimeType: string) {
  const uploadResult = await new Promise<any>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'taskflow/avatars',
        resource_type: 'auto',
      },
      (error, result) => {
        if (error || !result) return reject(error || new Error('Cloudinary upload failed'));
        resolve(result);
      }
    );
    stream.end(fileBuffer);
  });

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: uploadResult.secure_url },
    select: {
      id: true,
      username: true,
      email: true,
      fullName: true,
      avatarUrl: true,
      isVerified: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  return updatedUser;
}

export async function searchUsers(query: string) {
  if (!query || query.trim().length === 0) return [];
  const q = query.trim();
  return prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: q, mode: 'insensitive' } },
        { fullName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      avatarUrl: true,
    },
    take: 10,
  });
}

/**
 * Lấy hồ sơ công khai của một thành viên trong tổ chức.
 * Chỉ trả về các field an toàn — không email, password, verification, v.v.
 * Yêu cầu cả viewer và target đều là thành viên ACTIVE trong cùng org.
 */
export async function getMemberPublicProfile(viewerId: string, targetUserId: string, orgId: string) {
  // Verify viewer is an ACTIVE member of the org
  const viewerMembership = await prisma.organizationMember.findFirst({
    where: { organizationId: orgId, userId: viewerId, status: 'ACTIVE' },
  });
  if (!viewerMembership) {
    throw new AppError(403, 'ACCESS_DENIED', 'Bạn không có quyền truy cập tổ chức này.');
  }

  // Verify target user is a member of the org
  const targetMembership = await prisma.organizationMember.findFirst({
    where: { organizationId: orgId, userId: targetUserId, status: 'ACTIVE' },
    select: { role: true, joinedAt: true },
  });
  if (!targetMembership) {
    throw new AppError(404, 'MEMBER_NOT_FOUND', 'Không tìm thấy thành viên trong tổ chức này.');
  }

  // Fetch public user fields only — no email, passwordHash, isVerified, etc.
  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      username: true,
      fullName: true,
      avatarUrl: true,
    },
  });
  if (!user) {
    throw new UserNotFoundError();
  }

  // Get all project IDs in this org
  const orgProjects = await prisma.project.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true, key: true },
  });
  const orgProjectIds = orgProjects.map((p) => p.id);

  // Count assigned tasks (not DONE) and completed tasks in this org
  const [assignedTasksCount, completedTasksCount] = await Promise.all([
    prisma.task.count({
      where: {
        assigneeId: targetUserId,
        projectId: { in: orgProjectIds },
        status: { not: 'DONE' },
      },
    }),
    prisma.task.count({
      where: {
        assigneeId: targetUserId,
        projectId: { in: orgProjectIds },
        status: 'DONE',
      },
    }),
  ]);

  // Get projects with task counts for the target user
  const tasksPerProject = await prisma.task.groupBy({
    by: ['projectId'],
    where: {
      assigneeId: targetUserId,
      projectId: { in: orgProjectIds },
    },
    _count: { id: true },
  });

  const projectTaskMap = new Map(tasksPerProject.map((t) => [t.projectId, t._count.id]));
  const projects = orgProjects
    .filter((p) => projectTaskMap.has(p.id))
    .map((p) => ({
      id: p.id,
      name: p.name,
      key: p.key,
      taskCount: projectTaskMap.get(p.id) || 0,
    }))
    .sort((a, b) => b.taskCount - a.taskCount);

  return {
    ...user,
    membership: {
      role: targetMembership.role,
      joinedAt: targetMembership.joinedAt,
    },
    stats: {
      assignedTasksCount,
      completedTasksCount,
    },
    projects,
  };
}
