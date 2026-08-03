import { request } from "./auth";

export type PlatformRole = "USER" | "ADMIN";
export type AccountStatus = "ACTIVE" | "SUSPENDED";
export type OrganizationStatus =
  | "ACTIVE"
  | "SUSPENDED"
  | "PENDING_DELETION";

export interface AdminOverview {
  totalUsers: number;
  activeUsers: number;
  totalOrganizations: number;
  activeOrganizations: number;
  newUsersLast7Days: number;
  suspendedOrganizations: number;
  suspendedUsers: number;
  recentActivity: PlatformAuditActivity[];
}

export interface PlatformAuditActivity {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  createdAt: string;
  actor: {
    id: string;
    username: string;
    fullName: string;
  };
}

export interface AdminUserSummary {
  id: string;
  username: string;
  email: string | null;
  fullName: string;
  avatarUrl: string | null;
  platformRole: PlatformRole;
  status: AccountStatus;
  lastLoginAt: string | null;
  createdAt: string;
  suspendedAt: string | null;
  suspendReason: string | null;
  organizationCount: number;
}

export interface AdminUserMembership {
  id: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "GUEST";
  status: "ACTIVE" | "INVITED" | "SUSPENDED";
  joinedAt: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    avatarUrl: string | null;
    status: "ACTIVE" | "SUSPENDED" | "PENDING_DELETION";
  };
}

export interface AdminUserDetail extends AdminUserSummary {
  isVerified: boolean;
  suspendedBy: string | null;
  suspendedByUser: AdminOrganizationOwner | null;
  memberships: AdminUserMembership[];
}

export interface AdminUsersFilters {
  search?: string;
  status?: AccountStatus;
  platformRole?: PlatformRole;
  page?: number;
  pageSize?: number;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

export interface PlatformAuditLog {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  reason: string | null;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  createdAt: string;
  actor: {
    id: string;
    username: string;
    email: string | null;
    fullName: string;
  };
}

export interface AdminAuditLogFilters {
  actorId?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminOrganizationOwner {
  id: string;
  username: string;
  email: string | null;
  fullName: string;
}

export interface AdminOrganizationSummary {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  status: OrganizationStatus;
  createdAt: string;
  owner: AdminOrganizationOwner | null;
  memberCount: number;
  projectCount: number;
}

export interface AdminOrganizationMember {
  id: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "GUEST";
  status: "ACTIVE" | "INVITED" | "SUSPENDED";
  joinedAt: string;
  user: AdminOrganizationOwner;
}

export interface AdminOrganizationProject {
  id: string;
  name: string;
  key: string;
  status: string;
  taskCounter: number;
  createdAt: string;
}

export interface AdminOrganizationDetail extends AdminOrganizationSummary {
  suspendedAt: string | null;
  suspendedBy: string | null;
  suspendReason: string | null;
  deletedAt: string | null;
  updatedAt: string;
  suspendedByUser: AdminOrganizationOwner | null;
  members: AdminOrganizationMember[];
  projects: AdminOrganizationProject[];
}

export interface AdminOrganizationFilters {
  search?: string;
  status?: OrganizationStatus;
  page?: number;
  pageSize?: number;
}

export interface PlatformSettings {
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
}
export interface AdminSystemHealth {
  database: { status: "ok" | "error"; message: string };
  redis: {
    configured: boolean;
    status: "ok" | "error" | null;
    message: string;
  };
  activity: Array<{ date: string; tasks: number; projects: number }> | null;
  expiredRefreshTokens: number | null;
  attachmentThresholdMb: number;
  largeAttachments:
    | Array<{
        id: string;
        originalName: string;
        sizeBytes: string | number;
        uploadedAt: string;
        uploader: AdminOrganizationOwner;
      }>
    | null;
}

export async function getAdminOverview(signal?: AbortSignal) {
  return request<{ success: boolean; overview: AdminOverview }>(
    "/admin/overview",
    { method: "GET", signal },
  );
}

export async function getAdminUsers(
  filters: AdminUsersFilters = {},
  signal?: AbortSignal,
) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.platformRole) {
    params.set("platformRole", filters.platformRole);
  }
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));

  const query = params.toString();
  return request<{
    success: boolean;
    users: AdminUserSummary[];
    pagination: Pagination;
  }>(`/admin/users${query ? `?${query}` : ""}`, { method: "GET", signal });
}

export async function getAdminUser(userId: string, signal?: AbortSignal) {
  return request<{ success: boolean; user: AdminUserDetail }>(
    `/admin/users/${userId}`,
    { method: "GET", signal },
  );
}

export async function suspendAdminUser(userId: string, reason: string) {
  return request<{ success: boolean; user: AdminUserSummary }>(
    `/admin/users/${userId}/suspend`,
    {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    },
  );
}

export async function restoreAdminUser(userId: string, reason: string) {
  return request<{ success: boolean; user: AdminUserSummary }>(
    `/admin/users/${userId}/restore`,
    {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    },
  );
}

export async function getAdminAuditLogs(
  filters: AdminAuditLogFilters = {},
  signal?: AbortSignal,
) {
  const params = new URLSearchParams();
  if (filters.actorId) params.set("actorId", filters.actorId);
  if (filters.action) params.set("action", filters.action);
  if (filters.targetType) params.set("targetType", filters.targetType);
  if (filters.targetId) params.set("targetId", filters.targetId);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));

  const query = params.toString();
  return request<{
    success: boolean;
    logs: PlatformAuditLog[];
    pagination: Pagination;
  }>(`/admin/audit-logs${query ? `?${query}` : ""}`, {
    method: "GET",
    signal,
  });
}

export async function getAdminOrganizations(
  filters: AdminOrganizationFilters = {},
  signal?: AbortSignal,
) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));

  const query = params.toString();
  return request<{
    success: boolean;
    organizations: AdminOrganizationSummary[];
    pagination: Pagination;
  }>(`/admin/organizations${query ? `?${query}` : ""}`, {
    method: "GET",
    signal,
  });
}

export async function getAdminOrganization(
  organizationId: string,
  signal?: AbortSignal,
) {
  return request<{ success: boolean; organization: AdminOrganizationDetail }>(
    `/admin/organizations/${organizationId}`,
    { method: "GET", signal },
  );
}

export async function suspendAdminOrganization(
  organizationId: string,
  reason: string,
) {
  return request<{ success: boolean; organization: AdminOrganizationDetail }>(
    `/admin/organizations/${organizationId}/suspend`,
    { method: "PATCH", body: JSON.stringify({ reason }) },
  );
}

export async function restoreAdminOrganization(
  organizationId: string,
  reason: string,
) {
  return request<{ success: boolean; organization: AdminOrganizationDetail }>(
    `/admin/organizations/${organizationId}/restore`,
    { method: "PATCH", body: JSON.stringify({ reason }) },
  );
}

export async function getAdminSystemHealth(signal?: AbortSignal) {
  return request<{ success: boolean; health: AdminSystemHealth }>(
    "/admin/system-health",
    { method: "GET", signal },
  );
}

export async function getAdminSettings(signal?: AbortSignal) {
  return request<{
    success: boolean;
    settings: PlatformSettings;
    canManage: boolean;
  }>("/admin/settings", { method: "GET", signal });
}

export async function updateAdminSetting<
  Key extends keyof PlatformSettings,
>(
  key: Key,
  value: PlatformSettings[Key],
) {
  return request<{ success: boolean; setting: unknown }>(
    "/admin/settings",
    {
      method: "PATCH",
      body: JSON.stringify({ key, value }),
    },
  );
}