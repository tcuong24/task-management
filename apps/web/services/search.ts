import { request } from './auth';

export interface SearchTaskItem {
  id: string;
  type: 'task';
  title: string;
  displayCode: string;
  status: string;
  priority: string;
  dueDate: string | null;
  project: {
    id: string;
    key: string;
    name: string;
  };
  assignee: {
    id: string;
    fullName: string;
    username: string;
    avatarUrl?: string | null;
  } | null;
}

export interface SearchProjectItem {
  id: string;
  type: 'project';
  key: string;
  name: string;
  status: string;
  owner: {
    id: string;
    fullName: string;
    username: string;
    avatarUrl?: string | null;
  };
}

export interface SearchMemberItem {
  id: string;
  membershipId: string;
  type: 'member';
  fullName: string;
  username: string;
  email: string | null;
  avatarUrl?: string | null;
  role: string;
}

export interface GlobalSearchResult {
  success: boolean;
  query: string;
  results: {
    tasks: SearchTaskItem[];
    projects: SearchProjectItem[];
    members: SearchMemberItem[];
  };
  counts: {
    tasks: number;
    projects: number;
    members: number;
  };
}

export async function searchGlobal(
  orgId: string,
  query: string,
  signal?: AbortSignal,
  limit: number = 5,
): Promise<GlobalSearchResult> {
  const params = new URLSearchParams({
    q: query,
    limit: limit.toString(),
  });

  return request<GlobalSearchResult>(
    `/organizations/${orgId}/search?${params.toString()}`,
    {
      method: 'GET',
      signal,
    },
  );
}
