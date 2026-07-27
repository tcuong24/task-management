import { request } from './auth';

export interface ProjectInfo {
  id: string;
  name: string;
  key: string;
  description: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  owner: {
    fullName: string;
  };
}

export async function getProjects(orgId: string): Promise<{ success: boolean; projects: ProjectInfo[] }> {
  return request<{ success: boolean; projects: ProjectInfo[] }>(`/organizations/${orgId}/projects`, {
    method: 'GET',
  });
}

export async function getProjectByKey(
  orgId: string,
  key: string
): Promise<{ success: boolean; project: ProjectInfo }> {
  return request<{ success: boolean; project: ProjectInfo }>(`/organizations/${orgId}/projects/by-key/${key}`, {
    method: 'GET',
  });
}

export async function createProject(
  orgId: string,
  data: {
    name: string;
    key?: string;
    description?: string;
  }
): Promise<{ success: boolean; project: ProjectInfo }> {
  return request<{ success: boolean; project: ProjectInfo }>(`/organizations/${orgId}/projects`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface ProjectDashboardData {
  stats: {
    completed: number;
    updated: number;
    created: number;
    dueSoon: number;
  };
  statusOverview: { status: string; count: number }[];
  priorityBreakdown: { priority: string; count: number }[];
  taskTypes: { type: string; count: number }[];
}

export async function getProjectDashboard(
  orgId: string,
  projectId: string
): Promise<{ success: boolean; dashboard: ProjectDashboardData }> {
  return request<{ success: boolean; dashboard: ProjectDashboardData }>(`/organizations/${orgId}/projects/${projectId}/dashboard`, {
    method: 'GET',
  });
}

export async function getProjectTimeline(
  orgId: string,
  projectId: string
): Promise<{ success: boolean; tasks: any[] }> {
  return request<{ success: boolean; tasks: any[] }>(`/organizations/${orgId}/projects/${projectId}/timeline`, {
    method: 'GET',
  });
}
