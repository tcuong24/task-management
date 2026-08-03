import { prisma } from "@repo/database";

export const PLATFORM_SETTING_DEFAULTS = {
  // Mục Chung
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

  // Cấu hình đang có
  invitation_expiry_days: 7,
  max_upload_size_mb: 50,
  allowed_file_types: [
    "image/png",
    "image/jpeg",
    "application/pdf",
  ],
  maintenance_mode: false,
} as const;

export type PlatformSettingKey =
  keyof typeof PLATFORM_SETTING_DEFAULTS;

export type PlatformSettings = {
  platform_name: string;
  support_email: string;
  default_language: string;
  default_timezone: string;
  date_format: string;
  registration_enabled: boolean;
  organization_creation_enabled: boolean;
  default_project_view:
    | "summary"
    | "board"
    | "list"
    | "timeline";
  announcement_enabled: boolean;
  announcement_message: string;
  invitation_expiry_days: number;
  max_upload_size_mb: number;
  allowed_file_types: string[];
  maintenance_mode: boolean;
};

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const rows = await prisma.platformSetting.findMany();

  return rows.reduce(
    (settings, row) => ({
      ...settings,
      [row.key]: row.value,
    }),
    { ...PLATFORM_SETTING_DEFAULTS } as unknown as PlatformSettings,
  );
}

export async function getPlatformSetting<
  Key extends PlatformSettingKey,
>(
  key: Key,
): Promise<PlatformSettings[Key]> {
  const row = await prisma.platformSetting.findUnique({
    where: { key },
  });

  return (
    row?.value ?? PLATFORM_SETTING_DEFAULTS[key]
  ) as PlatformSettings[Key];
}