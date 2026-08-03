import { request } from './auth';

export interface TrashItem {
  id: string;
  type: 'project' | 'task';
  name: string;
  displayCode: string | null;
  project: {
    id: string;
    key: string;
    name: string;
  } | null;
  deletedAt: string;
  deletedBy: {
    id: string;
    fullName: string;
    username: string;
    avatarUrl: string | null;
  } | null;
  expiresAt: string;
  canRestore: boolean;
  restoreBlockedReason: string | null;
}

export interface TrashPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TrashResponse {
  success: boolean;
  items: TrashItem[];
  pagination: TrashPagination;
}

export interface TrashQueryParams {
  type?: 'all' | 'project' | 'task';
  q?: string;
  page?: number;
  limit?: number;
  sort?: 'deletedAt';
  order?: 'asc' | 'desc';
}

export async function getTrashItems(
  orgId: string,
  params?: TrashQueryParams,
  signal?: AbortSignal
): Promise<TrashResponse> {
  const query = new URLSearchParams();
  if (params?.type && params.type !== 'all') query.append('type', params.type);
  if (params?.q) query.append('q', params.q.trim());
  if (params?.page) query.append('page', String(params.page));
  if (params?.limit) query.append('limit', String(params.limit));
  if (params?.sort) query.append('sort', params.sort);
  if (params?.order) query.append('order', params.order);

  const queryString = query.toString();
  const url = `/organizations/${orgId}/trash${queryString ? `?${queryString}` : ''}`;

  return request<TrashResponse>(url, {
    method: 'GET',
    signal,
  });
}

export async function restoreProject(
  orgId: string,
  projectId: string
): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>(
    `/organizations/${orgId}/trash/projects/${projectId}/restore`,
    {
      method: 'POST',
    }
  );
}

export async function restoreTask(
  orgId: string,
  taskId: string
): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>(
    `/organizations/${orgId}/trash/tasks/${taskId}/restore`,
    {
      method: 'POST',
    }
  );
}

export async function purgeProject(
  orgId: string,
  projectId: string
): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>(
    `/organizations/${orgId}/trash/projects/${projectId}`,
    {
      method: 'DELETE',
    }
  );
}

export async function purgeTask(
  orgId: string,
  taskId: string
): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>(
    `/organizations/${orgId}/trash/tasks/${taskId}`,
    {
      method: 'DELETE',
    }
  );
}
