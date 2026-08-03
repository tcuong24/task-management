import type {
  Request,
  Response,
  NextFunction,
} from "express";

import { getPlatformSettings } from "../../common/services/platformSetting.service";

export async function getPublicPlatformSettingsHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const settings = await getPlatformSettings();

    res.json({
      success: true,
      settings: {
        platform_name: settings.platform_name,
        support_email: settings.support_email,
        default_language: settings.default_language,
        default_timezone: settings.default_timezone,
        date_format: settings.date_format,
        registration_enabled:
          settings.registration_enabled,
        organization_creation_enabled:
          settings.organization_creation_enabled,
        default_project_view:
          settings.default_project_view,
        announcement_enabled:
          settings.announcement_enabled,
        announcement_message:
          settings.announcement_message,
      },
    });
  } catch (error) {
    next(error);
  }
}