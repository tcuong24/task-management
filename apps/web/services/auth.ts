import { message } from 'antd';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface UserProfile {
  id: string;
  username: string;
  email: string | null;
  fullName: string;
  avatarUrl: string | null;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST' | null;
  platformRole: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
}

export interface LoginResponse {
  success: boolean;
  user: UserProfile;
}

export interface RegisterInput {
  username: string;
  email?: string;
  password: string;
  fullName: string;
}

export interface RegisterResponse {
  success: boolean;
  user: Pick<
    UserProfile,
    "id" | "username" | "email" | "fullName" | "avatarUrl"
  >;
}

export interface GetMeResponse {
  success: boolean;
  user: UserProfile;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

export interface SearchedUser {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  avatarUrl: string | null;
}

export async function searchUsers(query: string): Promise<{ success: boolean; users: SearchedUser[] }> {
  return request<{ success: boolean; users: SearchedUser[] }>(`/users/search?q=${encodeURIComponent(query)}`, {
    method: 'GET',
  });
}

export class ApiError extends Error {
  constructor(public status: number, public errorCode: string, msg: string) {
    super(msg);
    this.name = 'ApiError';
  }
}

export function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

let isRefreshing = false;
let refreshSubscribers: Array<(token: boolean) => void> = [];

function onRefreshed(success: boolean) {
  refreshSubscribers.forEach((callback) => callback(success));
  refreshSubscribers = [];
}

function addRefreshSubscriber(callback: (success: boolean) => void) {
  refreshSubscribers.push(callback);
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
  redirectOnUnauthorized = true,
): Promise<T> {
  const url = `${API_URL}${path}`;
  
  // Enforce credentials inclusion for cookie transmission
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const performRequest = async () => fetch(url, { ...options, headers, credentials: 'include' });

  let response = await performRequest();

  // If unauthorized and not hitting auth routes, try to refresh
  if (response.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/auth/refresh')) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        
        if (refreshResponse.ok) {
          isRefreshing = false;
          onRefreshed(true);
          // Retry the original request
          response = await performRequest();
        } else {
          onRefreshed(false);
          if (
            redirectOnUnauthorized &&
            !window.location.pathname.startsWith('/login')
          ) {
            message.error("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
            setTimeout(() => {
              window.location.href = '/login?expired=true';
            }, 1000);
          } else {
            isRefreshing = false;
          }
          throw new ApiError(401, 'TOKEN_EXPIRED', 'Phiên đăng nhập đã hết hạn.');
        }
      } catch (error) {
        onRefreshed(false);
        if (
          redirectOnUnauthorized &&
          !window.location.pathname.startsWith('/login')
        ) {
          message.error("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
          setTimeout(() => {
            window.location.href = '/login?expired=true';
          }, 1000);
        } else {
          isRefreshing = false;
        }
        throw error;
      }
    } else {
      // Wait for the ongoing refresh to complete
      const refreshSuccess = await new Promise<boolean>((resolve) => {
        addRefreshSubscriber((success) => resolve(success));
      });
      
      if (refreshSuccess) {
        response = await performRequest();
      } else {
        throw new ApiError(401, 'TOKEN_EXPIRED', 'Phiên đăng nhập đã hết hạn.');
      }
    }
  }

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

export async function login(username: string, password: string, rememberMe = false): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password, rememberMe }),
  });
}

export async function register(input: RegisterInput): Promise<RegisterResponse> {
  return request<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function logout(): Promise<LogoutResponse> {
  return request<LogoutResponse>('/auth/logout', {
    method: 'POST',
  });
}

export async function getMe(): Promise<GetMeResponse> {
  return request<GetMeResponse>(
    '/me',
    {
      method: 'GET',
    },
    false,
  );
}
