const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface Notification {
  id: string;
  userId: string;
  type: 'ORG_INVITE' | 'TASK_ASSIGNED' | 'GENERAL';
  title: string;
  content: string;
  isRead: boolean;
  payload: any;
  createdAt: string;
}

export interface GetNotificationsResponse {
  success: boolean;
  notifications: Notification[];
}

export interface MarkAsReadResponse {
  success: boolean;
  notification: Notification;
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
      data.message || 'An unexpected error occurred.'
    );
  }

  return data as T;
}

export async function getNotifications(unreadOnly = false): Promise<GetNotificationsResponse> {
  const query = unreadOnly ? '?unread=true' : '';
  return request<GetNotificationsResponse>(`/notifications${query}`, {
    method: 'GET',
  });
}

export async function markAsRead(id: string): Promise<MarkAsReadResponse> {
  return request<MarkAsReadResponse>(`/notifications/${id}/read`, {
    method: 'PATCH',
  });
}
