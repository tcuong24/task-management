import { request } from './auth';

export interface TaskLabelItem {
  taskId: string;
  labelId: string;
  label: {
    id: string;
    projectId: string;
    name: string;
    color: string;
  };
}

export interface TaskProject {
  id: string;
  name: string;
  key: string;
  organizationId?: string;
}

export interface TaskUser {
  id: string;
  fullName: string;
  username: string;
  avatarUrl: string | null;
}

export interface TaskAttachment {
  id: string;
  taskId: string | null;
  commentId: string | null;
  uploaderId: string;
  fileUrl: string;
  originalName: string;
  mimeType: string | null;
  sizeBytes: string | number | null;
  uploadedAt: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: TaskUser;
}

export interface TaskActivity {
  id: string;
  taskId: string;
  actorId: string;
  action: 'status_changed' | 'assignee_changed' | 'priority_changed' | 'due_date_changed' | 'start_date_changed' | 'created' | 'title_changed' | 'description_changed';
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  actor: TaskUser;
}

export interface SubTaskSummary {
  id: string;
  taskNumber: number;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  displayCode: string;
}

export interface ParentTaskSummary {
  id: string;
  taskNumber: number;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
  displayCode: string;
}

export interface OrgTask {
  id: string;
  projectId: string;
  parentTaskId: string | null;
  taskNumber?: number;
  displayCode?: string;
  title: string;
  description: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assigneeId: string | null;
  reporterId: string | null;
  startDate?: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  project?: TaskProject;
  assignee?: TaskUser | null;
  reporter?: TaskUser | null;
  _count?: {
    comments: number;
    attachments: number;
  };
}

export interface TaskDetail extends OrgTask {
  displayCode: string;
  project: TaskProject;
  labels: TaskLabelItem[];
  attachments: TaskAttachment[];
  comments: TaskComment[];
  subTasks: SubTaskSummary[];
  parentTask: ParentTaskSummary | null;
  taskActivities: TaskActivity[];
}

export async function getMyTasks(orgId: string): Promise<{ success: boolean; tasks: OrgTask[] }> {
  return request<{ success: boolean; tasks: OrgTask[] }>(`/organizations/${orgId}/tasks/me`, {
    method: 'GET',
  });
}

export async function getProjectTasks(orgId: string, projectId: string): Promise<{ success: boolean; tasks: OrgTask[] }> {
  return request<{ success: boolean; tasks: OrgTask[] }>(`/organizations/${orgId}/projects/${projectId}/tasks`, {
    method: 'GET',
  });
}

export async function createTask(
  orgId: string,
  projectId: string,
  data: {
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    assigneeId?: string | null;
    startDate?: string | null;
    dueDate?: string | null;
  }
): Promise<{ success: boolean; task: OrgTask }> {
  return request<{ success: boolean; task: OrgTask }>(`/organizations/${orgId}/projects/${projectId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTask(
  orgId: string,
  projectId: string,
  taskId: string,
  data: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    assigneeId?: string | null;
    startDate?: string | null;
    dueDate?: string | null;
  }
): Promise<{ success: boolean; task: OrgTask }> {
  return request<{ success: boolean; task: OrgTask }>(`/organizations/${orgId}/projects/${projectId}/tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function moveTask(
  orgId: string,
  projectId: string,
  taskId: string,
  newStatus: string,
  newPosition: number
): Promise<{ success: boolean; task: OrgTask }> {
  return request<{ success: boolean; task: OrgTask }>(`/organizations/${orgId}/projects/${projectId}/tasks/${taskId}/move`, {
    method: 'PATCH',
    body: JSON.stringify({ newStatus, newPosition }),
  });
}

export async function deleteTask(orgId: string, projectId: string, taskId: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/organizations/${orgId}/projects/${projectId}/tasks/${taskId}`, {
    method: 'DELETE',
  });
}

// ─── Direct /tasks API Service Methods ──────────────────────

export async function getTaskDetail(taskId: string): Promise<{ success: boolean; task: TaskDetail }> {
  return request<{ success: boolean; task: TaskDetail }>(`/tasks/${taskId}`, {
    method: 'GET',
  });
}

export async function patchTask(
  taskId: string,
  data: {
    title?: string;
    description?: string | null;
    status?: string;
    priority?: string;
    assigneeId?: string | null;
    startDate?: string | null;
    dueDate?: string | null;
    labelIds?: string[];
  }
): Promise<{ success: boolean; task: TaskDetail }> {
  return request<{ success: boolean; task: TaskDetail }>(`/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function addComment(taskId: string, content: string): Promise<{ success: boolean; comment: TaskComment }> {
  return request<{ success: boolean; comment: TaskComment }>(`/tasks/${taskId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export async function createDirectTask(data: {
  projectId: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeId?: string | null;
  parentTaskId?: string | null;
  dueDate?: string | null;
}): Promise<{ success: boolean; task: TaskDetail }> {
  return request<{ success: boolean; task: TaskDetail }>(`/tasks`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function createLabel(data: { projectId: string; name: string; color?: string }): Promise<{ success: boolean; label: any }> {
  return request<{ success: boolean; label: any }>(`/tasks/labels`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function uploadAttachment(taskId: string, file: File): Promise<{ success: boolean; attachment: TaskAttachment }> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_URL}/tasks/${taskId}/attachments`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Không thể tải file lên.');
  }

  return res.json();
}

export async function deleteAttachment(attachmentId: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/tasks/attachments/${attachmentId}`, {
    method: 'DELETE',
  });
}

