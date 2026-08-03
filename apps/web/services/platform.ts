import { request } from "./auth";

export interface PublicPlatformSettings {
  platform_name: string;
  support_email: string;
  default_language: string;
  default_timezone: string;
  date_format: string;

  registration_enabled: boolean;
  organization_creation_enabled: boolean;

  default_project_view: "summary" | "board" | "list" | "timeline";

  announcement_enabled: boolean;
  announcement_message: string;
}

export const DEFAULT_PUBLIC_PLATFORM_SETTINGS: PublicPlatformSettings = {
  platform_name: "TaskFlow",
  support_email: "",
  default_language: "vi",
  default_timezone: "Asia/Bangkok",
  date_format: "DD/MM/YYYY",
  registration_enabled: true,
  organization_creation_enabled: true,
  default_project_view: "summary",
  announcement_enabled: false,
  announcement_message: "",
};

export async function getPublicPlatformSettings(signal?: AbortSignal) {
  return request<{
    success: boolean;
    settings: PublicPlatformSettings;
  }>("/platform/settings", {
    method: "GET",
    signal,
  });
}
