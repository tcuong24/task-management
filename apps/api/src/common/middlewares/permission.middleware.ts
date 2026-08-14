import { NextFunction, Request, Response } from "express";
import { prisma } from "@repo/database";
import { PermissionAction, hasPermission } from "@repo/permissions";
import { AppError } from "../errors";

/**
 * Enforces organization-scoped RBAC.
 *
 * This middleware must run after `authenticate` and only grants access when:
 * - the request contains an organization context;
 * - the organization exists, is not deleted, and is ACTIVE;
 * - the authenticated user's membership is ACTIVE; and
 * - the membership role allows the requested action.
 */
export function requirePermission(action: PermissionAction) {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError(
          401,
          "AUTHENTICATION_REQUIRED",
          "Yêu cầu xác thực tài khoản.",
        );
      }

      // `id` is used by /organizations/:id/*; `orgId` supports routes that use
      // an explicit organization parameter or pass it in the request body.
      const organizationId =
        req.params.id ??
        req.params.orgId ??
        req.body?.organizationId ??
        req.body?.orgId;

      // Never infer access from a role in another organization. A permission
      // check without organization context must fail closed.
      if (!organizationId || typeof organizationId !== "string") {
        throw new AppError(
          400,
          "ORGANIZATION_CONTEXT_REQUIRED",
          "Thiếu thông tin tổ chức để kiểm tra quyền truy cập.",
        );
      }

      const membership = await prisma.organizationMember.findFirst({
        where: {
          organizationId,
          userId,
          organization: { deletedAt: null },
        },
        select: {
          role: true,
          status: true,
          organization: {
            select: { status: true },
          },
        },
      });

      if (!membership) {
        throw new AppError(
          403,
          "ORG_ACCESS_DENIED",
          "Bạn không phải là thành viên của tổ chức này.",
        );
      }

      if (membership.organization.status !== "ACTIVE") {
        if (membership.organization.status === "SUSPENDED") {
          throw new AppError(
            403,
            "ORGANIZATION_SUSPENDED",
            "Tổ chức này đã bị khóa.",
          );
        }

        throw new AppError(
          403,
          "ORGANIZATION_UNAVAILABLE",
          "Tổ chức này hiện không khả dụng.",
        );
      }

      if (membership.status !== "ACTIVE") {
        if (membership.status === "SUSPENDED") {
          throw new AppError(
            403,
            "MEMBERSHIP_SUSPENDED",
            "Quyền truy cập của bạn vào tổ chức này đã bị khóa.",
          );
        }

        throw new AppError(
          403,
          "MEMBERSHIP_INACTIVE",
          "Tư cách thành viên của bạn chưa được kích hoạt.",
        );
      }

      if (!hasPermission(membership.role, action)) {
        throw new AppError(
          403,
          "PERMISSION_DENIED",
          "Bạn không có đủ quyền để thực hiện hành động này.",
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
