import { NextFunction, Request, Response } from 'express';
import { prisma } from '@repo/database';
import { AppError } from '../errors';

export type PlatformPermission =
  | 'platform:overview:view'
  | 'platform:user:view'
  | 'platform:user:suspend'
  | 'platform:user:restore'
  | 'platform:org:view'
  | 'platform:org:suspend'
  | 'platform:org:restore'
  | 'platform:audit:view'
  | 'platform:metrics:view'
  | 'platform:settings:view'
  | 'platform:settings:manage';

const adminPermissions = new Set<PlatformPermission>([
  'platform:overview:view',
  'platform:user:view',
  'platform:user:suspend',
  'platform:user:restore',
  'platform:org:view',
  'platform:org:suspend',
  'platform:org:restore',
  'platform:audit:view',
  'platform:metrics:view',
  'platform:settings:view',
  'platform:settings:manage',
]);

/**
 * Authorizes platform-level operations only.
 * This middleware never reads OrganizationMember or OrgRole.
 */
export function requirePlatformPermission(permission: PlatformPermission) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Bạn cần đăng nhập.');
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { platformRole: true, status: true },
      });

      if (!user || user.status !== 'ACTIVE') {
        throw new AppError(403, 'ACCOUNT_SUSPENDED', 'Tài khoản không hoạt động.');
      }

      if (user.platformRole !== 'ADMIN' || !adminPermissions.has(permission)) {
        throw new AppError(
          403,
          'PLATFORM_PERMISSION_DENIED',
          'Bạn không có quyền quản trị nền tảng.',
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
