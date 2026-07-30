import { NextFunction, Request, Response } from 'express';
import { AppError } from '../../common/errors';
import * as adminService from './admin.service';

function positiveInteger(value: unknown, fallback: number, max?: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return max ? Math.min(parsed, max) : parsed;
}

function requestIp(req: Request) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim();
  return req.ip;
}

function requiredReason(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(
      400,
      'SUSPEND_REASON_REQUIRED',
      'Vui lòng nhập lý do khóa.',
    );
  }
  if (value.trim().length > 1000) {
    throw new AppError(
      400,
      'SUSPEND_REASON_TOO_LONG',
      'Lý do khóa tối đa 1000 ký tự.',
    );
  }
  return value.trim();
}

export async function getOverviewHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    res.json({ success: true, overview: await adminService.getOverview() });
  } catch (error) {
    next(error);
  }
}

export async function getUsersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const status =
      req.query.status === 'ACTIVE' || req.query.status === 'SUSPENDED'
        ? req.query.status
        : undefined;
    const platformRole =
      req.query.platformRole === 'USER' || req.query.platformRole === 'ADMIN'
        ? req.query.platformRole
        : undefined;

    const result = await adminService.getUsers({
      search:
        typeof req.query.search === 'string' ? req.query.search.trim() : undefined,
      status,
      platformRole,
      page: positiveInteger(req.query.page, 1),
      pageSize: positiveInteger(req.query.pageSize, 20, 100),
    });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getUserHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({
      success: true,
      user: await adminService.getUserById(req.params.id as string),
    });
  } catch (error) {
    next(error);
  }
}

export async function suspendUserHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await adminService.suspendUser(
      req.params.id as string,
      req.user!.userId,
      requiredReason(req.body.reason),
      requestIp(req),
    );
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
}

export async function restoreUserHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await adminService.restoreUser(
      req.params.id as string,
      req.user!.userId,
      requiredReason(req.body.reason),
      requestIp(req),
    );
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
}

export async function getOrganizationsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const allowedStatuses = ['ACTIVE', 'SUSPENDED', 'PENDING_DELETION'] as const;
    const status =
      typeof req.query.status === 'string' &&
      allowedStatuses.includes(req.query.status as (typeof allowedStatuses)[number])
        ? (req.query.status as (typeof allowedStatuses)[number])
        : undefined;
    const result = await adminService.getOrganizations({
      search:
        typeof req.query.search === 'string' ? req.query.search.trim() : undefined,
      status,
      page: positiveInteger(req.query.page, 1),
      pageSize: positiveInteger(req.query.pageSize, 20, 100),
    });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getOrganizationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    res.json({
      success: true,
      organization: await adminService.getOrganizationById(
        req.params.id as string,
      ),
    });
  } catch (error) {
    next(error);
  }
}

export async function suspendOrganizationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const organization = await adminService.suspendOrganization(
      req.params.id as string,
      req.user!.userId,
      requiredReason(req.body.reason),
      requestIp(req),
    );
    res.json({ success: true, organization });
  } catch (error) {
    next(error);
  }
}

export async function restoreOrganizationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const organization = await adminService.restoreOrganization(
      req.params.id as string,
      req.user!.userId,
      requiredReason(req.body.reason),
      requestIp(req),
    );
    res.json({ success: true, organization });
  } catch (error) {
    next(error);
  }
}

export async function getAuditLogsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const dateFrom =
      typeof req.query.dateFrom === 'string'
        ? new Date(req.query.dateFrom)
        : undefined;
    const dateTo =
      typeof req.query.dateTo === 'string' ? new Date(req.query.dateTo) : undefined;

    if (
      (dateFrom && Number.isNaN(dateFrom.getTime())) ||
      (dateTo && Number.isNaN(dateTo.getTime()))
    ) {
      throw new AppError(
        400,
        'INVALID_DATE_RANGE',
        'Khoảng thời gian không hợp lệ.',
      );
    }
    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw new AppError(
        400,
        'INVALID_DATE_RANGE',
        'Thời gian bắt đầu phải trước thời gian kết thúc.',
      );
    }

    const result = await adminService.getAuditLogs({
      actorId:
        typeof req.query.actorId === 'string' ? req.query.actorId : undefined,
      action: typeof req.query.action === 'string' ? req.query.action : undefined,
      targetType:
        typeof req.query.targetType === 'string'
          ? req.query.targetType
          : undefined,
      dateFrom,
      dateTo,
      page: positiveInteger(req.query.page, 1),
      pageSize: positiveInteger(req.query.pageSize, 50, 100),
    });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getSystemHealthHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    res.json({ success: true, health: await adminService.getSystemHealth() });
  } catch (error) {
    next(error);
  }
}

export async function getSettingsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    res.json({
      success: true,
      settings: await adminService.getPlatformSettings(),
      canManage: req.user?.platformRole === 'ADMIN',
    });
  } catch (error) {
    next(error);
  }
}

export async function updateSettingHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (typeof req.body.key !== 'string') {
      throw new AppError(400, 'INVALID_SETTING', 'Thiếu key cấu hình.');
    }
    const setting = await adminService.updatePlatformSetting(
      req.body.key,
      req.body.value,
      req.user!.userId,
      requestIp(req),
    );
    res.json({ success: true, setting });
  } catch (error) {
    next(error);
  }
}
