import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware';
import { requirePlatformPermission } from '../../common/middlewares/platform-permission.middleware';
import * as controller from './admin.controller';

const router = Router();

router.use(authenticate);

router.get(
  '/overview',
  requirePlatformPermission('platform:overview:view'),
  controller.getOverviewHandler,
);

router.get(
  '/users',
  requirePlatformPermission('platform:user:view'),
  controller.getUsersHandler,
);
router.get(
  '/users/:id',
  requirePlatformPermission('platform:user:view'),
  controller.getUserHandler,
);
router.patch(
  '/users/:id/suspend',
  requirePlatformPermission('platform:user:suspend'),
  controller.suspendUserHandler,
);
router.patch(
  '/users/:id/restore',
  requirePlatformPermission('platform:user:restore'),
  controller.restoreUserHandler,
);

router.get(
  '/organizations',
  requirePlatformPermission('platform:org:view'),
  controller.getOrganizationsHandler,
);
router.get(
  '/organizations/:id',
  requirePlatformPermission('platform:org:view'),
  controller.getOrganizationHandler,
);
router.patch(
  '/organizations/:id/suspend',
  requirePlatformPermission('platform:org:suspend'),
  controller.suspendOrganizationHandler,
);
router.patch(
  '/organizations/:id/restore',
  requirePlatformPermission('platform:org:restore'),
  controller.restoreOrganizationHandler,
);

router.get(
  '/audit-logs',
  requirePlatformPermission('platform:audit:view'),
  controller.getAuditLogsHandler,
);

router.get(
  '/system-health',
  requirePlatformPermission('platform:metrics:view'),
  controller.getSystemHealthHandler,
);

router.get(
  '/settings',
  requirePlatformPermission('platform:settings:view'),
  controller.getSettingsHandler,
);
router.patch(
  '/settings',
  requirePlatformPermission('platform:settings:manage'),
  controller.updateSettingHandler,
);

export default router;
