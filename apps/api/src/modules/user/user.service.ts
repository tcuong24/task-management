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
