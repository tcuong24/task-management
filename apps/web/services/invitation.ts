const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface OrganizationInvitation {
  id: string;
  organizationId: string;
  email: string;
  invitedRole: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';
  invitedById: string;
  token: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED' | 'DECLINED';
  expiresAt: string;
  createdAt: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  invitedBy: {
    fullName: string;
  };
}

export interface GetInvitationResponse {
  success: boolean;
  invitation: OrganizationInvitation;
}

export interface AcceptInvitationResponse {
  success: boolean;
  member: {
    id: string;
    organizationId: string;
    userId: string;
    role: string;
    status: string;
    organization?: {
      id: string;
      name: string;
      slug: string;
    };
  };
}

export interface DeclineInvitationResponse {
  success: boolean;
  message: string;
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

export async function getInvitation(token: string): Promise<GetInvitationResponse> {
  return request<GetInvitationResponse>(`/invitations/${token}`, {
    method: 'GET',
  });
}

export async function acceptInvitation(token: string): Promise<AcceptInvitationResponse> {
  return request<AcceptInvitationResponse>(`/invitations/${token}/accept`, {
    method: 'POST',
  });
}

export async function declineInvitation(token: string): Promise<DeclineInvitationResponse> {
  return request<DeclineInvitationResponse>(`/invitations/${token}/decline`, {
    method: 'POST',
  });
}
