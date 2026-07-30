import { OrgRole } from '@repo/permissions';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrgMember {
  id: string;
  organizationId: string;
  userId: string;
  role: OrgRole;
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  joinedAt: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
  };
}

export interface GetOrgResponse {
  success: boolean;
  organization: Organization;
}

export interface UpdateOrgResponse {
  success: boolean;
  organization: Organization;
}

export interface OrgInvitation {
  id: string;
  email: string;
  invitedRole: OrgRole;
  createdAt: string;
  expiresAt: string;
  invitedBy?: {
    id: string;
    fullName: string;
    username: string;
  };
}

export interface GetMembersResponse {
  success: boolean;
  members: OrgMember[];
  invitations?: OrgInvitation[];
}

export interface InviteMemberResponse {
  success: boolean;
  member: OrgMember;
}

export interface UpdateMemberRoleResponse {
  success: boolean;
  member: OrgMember;
}

class ApiError extends Error {
  constructor(public status: number, public errorCode: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_URL}${path}`;
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.errorCode || 'UNKNOWN_ERROR',
      data.message || 'Đã có lỗi xảy ra.'
    );
  }

  return data as T;
}

export async function getOrganization(id: string): Promise<GetOrgResponse> {
  return request<GetOrgResponse>(`/organizations/${id}`, {
    method: 'GET',
  });
}

export async function getOrganizationBySlug(slug: string): Promise<GetOrgResponse> {
  return request<GetOrgResponse>(`/organizations/by-slug/${slug}`, {
    method: 'GET',
  });
}

export async function updateOrganization(id: string, name: string, slug: string): Promise<UpdateOrgResponse> {
  return request<UpdateOrgResponse>(`/organizations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name, slug }),
  });
}

export async function getMembers(
  id: string,
  signal?: AbortSignal,
): Promise<GetMembersResponse> {
  return request<GetMembersResponse>(`/organizations/${id}/members`, {
    method: 'GET',
    signal,
  });
}

export async function inviteMember(id: string, email: string, role: OrgRole): Promise<InviteMemberResponse> {
  return request<InviteMemberResponse>(`/organizations/${id}/members/invite`, {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });
}
export async function suspendMember(id: string, memberId: string): Promise<{ success: boolean; member: OrgMember }> {
  return request<{ success: boolean; member: OrgMember }>(`/organizations/${id}/members/${memberId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'SUSPENDED' }),
  });
}
export async function updateMemberRole(id: string, memberId: string, role: OrgRole): Promise<UpdateMemberRoleResponse> {
  return request<UpdateMemberRoleResponse>(`/organizations/${id}/members/${memberId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export async function updateMemberStatus(id: string, memberId: string, status: 'ACTIVE' | 'SUSPENDED'): Promise<{ success: boolean; member: OrgMember }> {
  return request<{ success: boolean; member: OrgMember }>(`/organizations/${id}/members/${memberId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function removeMember(id: string, memberId: string): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>(`/organizations/${id}/members/${memberId}`, {
    method: 'DELETE',
  });
}

export async function resendInvitation(id: string, invitationId: string): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>(`/organizations/${id}/invitations/${invitationId}/resend`, {
    method: 'POST',
  });
}

export interface UserOrgInfo {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  userRole: OrgRole;
  membersCount: number;
  ownerName: string;
}

export interface GetUserOrgsResponse {
  success: boolean;
  organizations: UserOrgInfo[];
}

export interface OrgStats {
  projectsCount: number;
  membersCount: number;
  tasksCount: number;
}

export interface GetOrgStatsResponse {
  success: boolean;
  stats: OrgStats;
}

export async function getUserOrganizations(): Promise<GetUserOrgsResponse> {
  return request<GetUserOrgsResponse>('/organizations', {
    method: 'GET',
  });
}

export async function createOrganization(
  name: string,
  slug: string,
  ownerId: string,
  avatarUrl?: string,
  memberIds?: string[]
): Promise<UpdateOrgResponse> {
  return request<UpdateOrgResponse>('/organizations', {
    method: 'POST',
    body: JSON.stringify({ name, slug, ownerId, avatarUrl, memberIds }),
  });
}

export async function getOrganizationStats(id: string): Promise<GetOrgStatsResponse> {
  return request<GetOrgStatsResponse>(`/organizations/${id}/stats`, {
    method: 'GET',
  });
}

export interface WorkloadItem {
  assigneeId: string | null;
  assigneeName: string;
  avatarUrl: string | null;
  taskCount: number;
}

export interface DashboardSummaryResponse {
  success: boolean;
  summary: {
    metrics: {
      totalProjects: number;
      dueSoonTasksCount: number;
      overdueTasksCount: number;
      completedThisWeekCount: number;
      blockedOrCriticalCount?: number;
    };
    statusBreakdown?: {
      TODO: number;
      IN_PROGRESS: number;
      IN_REVIEW: number;
      DONE: number;
    };
    workload?: WorkloadItem[];
    totalTasksCount?: number;
    projectsProgress: {
      id: string;
      key: string;
      name: string;
      totalTasks: number;
      doneTasks: number;
      progressPercentage: number;
      overdueCount?: number;
      owner?: {
        fullName: string;
        avatarUrl: string | null;
      };
    }[];
    attentionItems?: {
      overdueTasks: {
        id: string;
        title: string;
        displayCode: string;
        dueDate: string | null;
        priority: string;
        projectKey: string;
        assigneeName: string;
        assigneeAvatarUrl?: string | null;
      }[];
      unassignedTasks: {
        id: string;
        title: string;
        displayCode: string;
        priority: string;
        projectKey: string;
      }[];
      criticalTasks: {
        id: string;
        title: string;
        displayCode: string;
        status: string;
        projectKey: string;
        assigneeName: string;
      }[];
    };
    upcomingDeadlines?: {
      id: string;
      title: string;
      displayCode: string;
      dueDate: string | null;
      priority: string;
      status: string;
      projectKey: string;
      assigneeName: string;
      assigneeAvatarUrl?: string | null;
    }[];
  };
}

export async function getDashboardSummary(id: string): Promise<DashboardSummaryResponse> {
  return request<DashboardSummaryResponse>(`/organizations/${id}/dashboard-summary`, {
    method: 'GET',
  });
}

export async function getMyTasksInOrg(
  id: string,
  filters?: { projectId?: string; priority?: string },
  signal?: AbortSignal
): Promise<{ success: boolean; tasks: any[] }> {
  const queryParams = new URLSearchParams();
  if (filters?.projectId) queryParams.append('projectId', filters.projectId);
  if (filters?.priority) queryParams.append('priority', filters.priority);

  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

  return request<{ success: boolean; tasks: any[] }>(`/organizations/${id}/my-tasks${queryString}`, {
    method: 'GET',
    signal
  });
}

export interface ActivityLogItem {
  id: string;
  organizationId: string;
  entityType: 'TASK' | 'PROJECT' | 'ORGANIZATION' | 'MEMBER';
  entityId: string;
  actorId: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  actor: {
    id: string;
    fullName: string;
    username: string;
    avatarUrl?: string | null;
  };
}

export interface GetActivitiesResponse {
  success: boolean;
  activities: ActivityLogItem[];
}

export async function getOrganizationActivities(id: string, limit = 20, signal?: AbortSignal): Promise<GetActivitiesResponse> {
  return request<GetActivitiesResponse>(`/organizations/${id}/activities?limit=${limit}`, {
    method: 'GET',
    signal,
  });
}
