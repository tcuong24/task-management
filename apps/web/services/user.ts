import { request } from './auth';

export interface UserMembership {
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
  joinedAt: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    avatarUrl: string | null;
  };
}

export interface UserProfileDetail {
  id: string;
  username: string;
  email: string | null;
  fullName: string;
  avatarUrl: string | null;
  isVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  memberships: UserMembership[];
}

export interface SearchUser {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  avatarUrl: string | null;
}

export interface PlatformUserMembership {
  id?: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';
  organization: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface PlatformUser {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  avatarUrl: string | null;
  memberships: PlatformUserMembership[];
}

export async function getMeDetail(): Promise<{ success: boolean; user: UserProfileDetail }> {
  return request<{ success: boolean; user: UserProfileDetail }>('/users/me', {
    method: 'GET',
  });
}

export async function updateMe(data: { fullName?: string; avatarUrl?: string; email?: string }): Promise<{ success: boolean; user: UserProfileDetail; message: string }> {
  return request<{ success: boolean; user: UserProfileDetail; message: string }>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>('/users/me/change-password', {
    method: 'POST',
    body: JSON.stringify({ oldPassword, newPassword }),
  });
}

export async function searchUsers(
  query: string,
  excludeOrgId?: string,
  signal?: AbortSignal,
): Promise<{ success: boolean; users: SearchUser[] }> {
  const params = new URLSearchParams({ q: query });
  if (excludeOrgId) params.append('excludeOrgId', excludeOrgId);
  return request<{ success: boolean; users: SearchUser[] }>(`/users/search?${params.toString()}`, {
    method: 'GET',
    signal,
  });
}

export async function getAllUsers(): Promise<{ success: boolean; users: PlatformUser[] }> {
  return request<{ success: boolean; users: PlatformUser[] }>('/users', {
    method: 'GET',
  });
}

export async function uploadAvatar(file: File): Promise<{ success: boolean; user: UserProfileDetail; message: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const response = await fetch(`${API_URL}/users/avatar`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Tải ảnh lên thất bại.');
  }

  return data;
}

// --- Public Member Profile ---

export interface MemberPublicProfile {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  membership: {
    role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';
    joinedAt: string;
  };
  stats: {
    assignedTasksCount: number;
    completedTasksCount: number;
  };
  projects: Array<{
    id: string;
    name: string;
    key: string;
    taskCount: number;
  }>;
}

export async function getMemberProfile(
  userId: string,
  orgId: string,
): Promise<{ success: boolean; profile: MemberPublicProfile }> {
  return request<{ success: boolean; profile: MemberPublicProfile }>(
    `/users/${userId}/profile?orgId=${orgId}`,
    { method: 'GET' },
  );
}
