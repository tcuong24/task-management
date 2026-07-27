import { Request, Response, NextFunction } from 'express';
import { PermissionAction, hasPermission, OrgRole } from '@repo/permissions';
import { prisma } from '@repo/database';

/**
 * Express middleware to enforce role-based access control (RBAC).
 * Requires the request to have gone through the `authenticate` middleware first.
 */
export function requirePermission(action: PermissionAction) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Yêu cầu xác thực tài khoản.' });
        return;
      }

      const orgId = req.params.id || req.params.orgId || req.body.organizationId || req.body.orgId;

      let resolvedRole: OrgRole | null = null;

      if (orgId) {
        // Check role for specific organization
        const membership = await prisma.organizationMember.findUnique({
          where: {
            organizationId_userId: {
              organizationId: orgId,
              userId: userId,
            },
          },
        });
        if (membership) {
          resolvedRole = membership.role;
        }
      } else {
        // Fallback to highest role across memberships if no org context is provided
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            memberships: { select: { role: true } },
          },
        });

        if (user && user.memberships && user.memberships.length > 0) {
          const roles = user.memberships.map((m) => m.role);
          if (roles.includes('OWNER')) {
            resolvedRole = 'OWNER';
          } else if (roles.includes('ADMIN')) {
            resolvedRole = 'ADMIN';
          } else if (roles.includes('MEMBER')) {
            resolvedRole = 'MEMBER';
          } else if (roles.includes('GUEST')) {
            resolvedRole = 'GUEST';
          }
        }
      }

      if (!resolvedRole) {
        res.status(403).json({
          success: false,
          message: 'Bạn không phải là thành viên của tổ chức này hoặc không có quyền truy cập.',
        });
        return;
      }

      // Verify the permission matrix
      if (!hasPermission(resolvedRole, action)) {
        res.status(403).json({
          success: false,
          message: 'Bạn không có đủ quyền hạn để thực hiện hành động này.',
        });
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
