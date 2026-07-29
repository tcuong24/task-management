'use client';

import React, { useState } from 'react';
import {
  Button,
  Avatar,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Tag,
  App,
  Spin,
} from 'antd';
import CustomTooltip from '../common/CustomTooltip';
import {
  PlusOutlined,
  ClockCircleOutlined,
  UserOutlined,
  CommentOutlined,
  PaperClipOutlined,
  ProjectOutlined,
  CheckCircleFilled,
  CheckSquareOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { useOrg } from '../../contexts/OrgContext';
import { TaskDetailDrawer } from './TaskDetailDrawer';

export interface TaskItem {
  id: string;
  title: string;
  description?: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  position?: number;
  taskNumber?: number;
  displayCode?: string;
  startDate?: string | null;
  dueDate?: string | null;
  createdAt?: string | null;
  assigneeId?: string | null;
  reporterId?: string | null;
  parentTaskId?: string | null;
  subTasks?: TaskItem[];
  projectId: string;
  project?: {
    id: string;
    key: string;
    name: string;
  };
  assignee?: {
    id: string;
    fullName?: string;
    username?: string;
    avatarUrl?: string | null;
  } | null;
  _count?: {
    comments?: number;
    attachments?: number;
  };
  comments?: any[];
  attachments?: any[];
}

interface KanbanBoardProps {
  tasks: TaskItem[];
  loading: boolean;
  showProjectBadge?: boolean;
  defaultProjectId?: string;
  requireProjectSelect?: boolean;
  projectsList?: { id: string; key: string; name: string }[];
  membersList?: { userId: string; name: string }[];
  onStatusChange: (task: TaskItem, newStatus: TaskItem['status']) => void;
  onTaskSave: (data: {
    id?: string;
    projectId: string;
    title: string;
    description?: string;
    status?: TaskItem['status'];
    priority?: TaskItem['priority'];
    assigneeId?: string | null;
    dueDate?: string | null;
  }) => Promise<void>;
  onTaskDelete?: (task: TaskItem) => Promise<void>;
}

const COLUMN_TITLES: Record<TaskItem['status'], string> = {
  TODO: 'Cần làm',
  IN_PROGRESS: 'Đang làm',
  IN_REVIEW: 'Đang kiểm tra',
  DONE: 'Hoàn thành',
};

const COLUMN_COLORS: Record<TaskItem['status'], { bg: string; border: string; badge: string }> = {
  TODO: { bg: 'bg-gray-50/80', border: 'border-gray-200', badge: 'bg-gray-200 text-gray-700' },
  IN_PROGRESS: { bg: 'bg-blue-50/50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' },
  IN_REVIEW: { bg: 'bg-amber-50/50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700' },
  DONE: { bg: 'bg-emerald-50/50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' },
};

const PRIORITY_BADGES: Record<TaskItem['priority'], string> = {
  LOW: '!bg-[#F1F5F9] !text-[#64748B]',
  MEDIUM: '!bg-blue-50 !text-blue-700',
  HIGH: '!bg-[#FFEDD5] !text-[#C2410C]',
  CRITICAL: '!bg-red-100 !text-red-700 font-bold',
};

const PRIORITY_LABELS: Record<TaskItem['priority'], string> = {
  LOW: 'Thấp',
  MEDIUM: 'Trung bình',
  HIGH: 'Cao',
  CRITICAL: 'Khẩn cấp',
};

const AVATAR_PALETTE = [
  '#10B981', '#3B82F6', '#6366F1', '#8B5CF6',
  '#EC4899', '#F59E0B', '#EF4444', '#06B6D4',
];

function getUserAvatarColor(id?: string | null): string {
  if (!id) return '#9CA3AF';
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length] || '#9CA3AF';
}

export function KanbanBoard({
  tasks,
  loading,
  showProjectBadge = false,
  defaultProjectId,
  requireProjectSelect = false,
  projectsList = [],
  membersList = [],
  onStatusChange,
  onTaskSave,
  onTaskDelete,
}: KanbanBoardProps) {
  const { message } = App.useApp();
  const { user } = useAuth();
  const { userRole } = useOrg();
  const params = useParams();
  const router = useRouter();

  const orgSlug = (params?.orgSlug as string) || '';
  const projectKey = (params?.projectKey as string) || '';

  const effectiveMembersList = React.useMemo(() => {
    const map = new Map<string, string>();

    if (user?.id) {
      map.set(user.id, user.fullName || user.username || user.id);
    }

    if (membersList && Array.isArray(membersList)) {
      membersList.forEach((m) => {
        if (m.userId) {
          map.set(m.userId, m.name || m.userId);
        }
      });
    }

    if (tasks && Array.isArray(tasks)) {
      tasks.forEach((t) => {
        if (t.assigneeId && t.assignee) {
          map.set(t.assigneeId, t.assignee.fullName || t.assignee.username || t.assigneeId);
        }
      });
    }

    return Array.from(map.entries()).map(([userId, name]) => ({ userId, name }));
  }, [membersList, tasks, user]);

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Modal create/edit task state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createInitialStatus, setCreateInitialStatus] = useState<TaskItem['status']>('TODO');
  const [submittingTask, setSubmittingTask] = useState(false);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<TaskItem | null>(null);
  const [taskForm] = Form.useForm();

  const isEditable = (task: TaskItem | null) => {
    if (!task) return true;
    if (userRole === 'OWNER' || userRole === 'ADMIN') return true;
    return task.assigneeId === user?.id || task.reporterId === user?.id;
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedTaskId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: TaskItem['status']) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setDraggedTaskId(null);

    if (!id) return;
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === targetStatus) return;

    if (!isEditable(task)) {
      message.warning('Bạn không có quyền chuyển trạng thái công việc này.');
      return;
    }

    onStatusChange(task, targetStatus);
  };

  const handleOpenCreateModal = (initialStatus: TaskItem['status'] = 'TODO') => {
    setCreateInitialStatus(initialStatus);
    setSelectedTaskForDetail(null);
    taskForm.resetFields();
    taskForm.setFieldsValue({
      status: initialStatus,
      priority: 'MEDIUM',
      projectId: defaultProjectId || (projectsList && projectsList.length > 0 ? projectsList[0]?.id : undefined),
      assigneeId: user?.id,
    });
    setCreateModalOpen(true);
  };

  const handleTaskCardClick = (task: TaskItem) => {
    const keyToUse = task.project?.key || projectKey;
    if (orgSlug && keyToUse) {
      router.push(`/dashboard/${orgSlug}/projects/${keyToUse}/tasks/${task.id}`);
    }
  };

  const handleSaveTask = async (values: any) => {
    try {
      setSubmittingTask(true);
      const projectIdToUse = values.projectId || defaultProjectId;

      if (requireProjectSelect && !projectIdToUse) {
        message.error('Vui lòng chọn Dự án cho công việc.');
        return;
      }

      await onTaskSave({
        id: selectedTaskForDetail?.id,
        projectId: projectIdToUse,
        title: values.title,
        description: values.description,
        status: values.status || createInitialStatus,
        priority: values.priority || 'MEDIUM',
        assigneeId: values.assigneeId || user?.id,
        dueDate: values.dueDate ? values.dueDate.toISOString() : null,
      });

      setCreateModalOpen(false);
      taskForm.resetFields();
    } catch (err: any) {
      message.error(err.message || 'Thao tác không thành công.');
    } finally {
      setSubmittingTask(false);
    }
  };

  const statuses: TaskItem['status'][] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

  return (
    <div className="flex flex-col gap-4">
      {/* Upper action row */}
      <div className="flex justify-end">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleOpenCreateModal('TODO')}
          className="!bg-indigo-600 hover:!bg-indigo-700 border-none font-semibold text-white shadow-sm rounded-xl h-[40px] px-5"
        >
          Tạo task mới
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spin size="large" tip="Đang tải danh sách công việc..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start min-h-[500px]">
          {statuses.map((status) => {
            const colTasks = tasks.filter((t) => t.status === status && !t.parentTaskId);
            const style = COLUMN_COLORS[status];

            return (
              <div
                key={status}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, status)}
                className={`flex flex-col rounded-2xl p-3.5 border ${style.border} ${style.bg} min-h-[500px] transition-colors`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-800 text-sm tracking-tight m-0">
                      {COLUMN_TITLES[status]}
                    </h3>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
                      {colTasks.length}
                    </span>
                  </div>

                  <button
                    onClick={() => handleOpenCreateModal(status)}
                    className="w-7 h-7 rounded-lg hover:bg-black/5 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors"
                  >
                    <PlusOutlined className="text-xs" />
                  </button>
                </div>

                {/* Column Content */}
                <div className="flex flex-col gap-2.5 flex-1 overflow-y-auto">
                  {colTasks.map((task) => {
                    const editable = isEditable(task);
                    const commentsCount = task._count?.comments ?? task.comments?.length ?? 0;
                    const attachmentsCount = task._count?.attachments ?? task.attachments?.length ?? 0;
                    const hasSubtasks = task.subTasks && task.subTasks.length > 0;
                    const completedSubtasks = hasSubtasks ? task.subTasks!.filter((st) => st.status === 'DONE').length : 0;
                    const totalSubtasks = hasSubtasks ? task.subTasks!.length : 0;

                    return (
                      <div
                        key={task.id}
                        draggable={editable}
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onClick={() => handleTaskCardClick(task)}
                        className={`bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group relative ${
                          draggedTaskId === task.id ? 'opacity-40 scale-[0.98]' : ''
                        } ${hasSubtasks ? 'border-l-4 border-l-indigo-300/80 pl-2.5' : ''}`}
                      >
                        {/* Project & Code Badge */}
                        <div className="mb-2 flex items-center justify-between gap-1.5">
                          {showProjectBadge && task.project ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 truncate">
                              <ProjectOutlined className="text-[10px]" />
                              [{task.project.key}] {task.project.name}
                            </span>
                          ) : <div />}

                          {(task.displayCode || (task.project?.key && task.taskNumber)) && (
                            <span className="inline-flex items-center text-[11px] font-mono font-semibold text-indigo-600 bg-slate-50 px-1.5 py-0.5 rounded border border-gray-200/80">
                              {task.status === 'DONE' && (
                                <CheckCircleFilled className="text-emerald-500 text-[11px] mr-1" />
                              )}
                              {task.displayCode || `${task.project?.key}-${task.taskNumber}`}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h4 className={`text-sm font-semibold leading-snug line-clamp-2 mb-2 transition-colors ${task.status === 'DONE'
                            ? 'line-through text-gray-400 font-normal'
                            : 'text-gray-800 group-hover:text-indigo-600'
                          }`}>
                          {task.title}
                        </h4>

                        {/* Subtask Progress Indicator */}
                        {hasSubtasks && (
                          <div
                            className={`flex items-center gap-1.5 text-[11px] font-semibold mb-2.5 ${
                              completedSubtasks === totalSubtasks ? 'text-emerald-500' : 'text-gray-400'
                            }`}
                            title="Tiến độ công việc con"
                          >
                            <CheckSquareOutlined className="text-[10px]" />
                            <span>{completedSubtasks}/{totalSubtasks} subtasks</span>
                          </div>
                        )}

                        {/* Badges & Meta */}
                        <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-gray-100 text-xs text-gray-500">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Priority Badge */}
                            <Tag className={`m-0 text-[10px] border-none px-2 py-0.5 rounded-md font-semibold ${PRIORITY_BADGES[task.priority]}`}>
                              {PRIORITY_LABELS[task.priority]}
                            </Tag>

                            {/* Due Date (only if exists) */}
                            {task.dueDate ? (
                              <span
                                className={`flex items-center gap-1 text-[11px] font-medium ${dayjs(task.dueDate).isBefore(dayjs(), 'day')
                                    ? '!text-red-500 font-bold'
                                    : '!text-gray-400'
                                  }`}
                              >
                                <ClockCircleOutlined className="text-[10px]" />
                                {dayjs(task.dueDate).format('DD/MM')}
                              </span>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Comments Count */}
                            {commentsCount > 0 ? (
                              <span className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
                                <CommentOutlined className="text-[10px]" />
                                {commentsCount}
                              </span>
                            ) : null}

                            {/* Attachments Count */}
                            {attachmentsCount > 0 ? (
                              <span className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
                                <PaperClipOutlined className="text-[10px]" />
                                {attachmentsCount}
                              </span>
                            ) : null}

                            {/* Assignee Avatar */}
                            {task.assignee ? (
                              <CustomTooltip title={task.assignee.fullName || task.assignee.username}>
                                <Avatar
                                  size={22}
                                  src={task.assignee.avatarUrl || undefined}
                                  style={{ backgroundColor: getUserAvatarColor(task.assignee.id) }}
                                  className="text-white font-bold text-[10px] flex-shrink-0 border border-white"
                                >
                                  {(task.assignee.fullName || task.assignee.username || 'U').charAt(0).toUpperCase()}
                                </Avatar>
                              </CustomTooltip>
                            ) : (
                              <CustomTooltip title="Chưa phân công">
                                <Avatar size={22} icon={<UserOutlined />} className="bg-gray-100 text-gray-400 text-[10px]" />
                              </CustomTooltip>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {colTasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-gray-200/80 rounded-xl my-1 flex-1 min-h-[140px]">
                      <p className="text-xs font-medium text-gray-400 m-0">Kéo task vào đây</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Create Task */}
      <Modal
        title={<div className="flex items-center gap-2 text-gray-800 text-lg font-bold">Tạo công việc mới</div>}
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          taskForm.resetFields();
        }}
        footer={null}
        centered
        width={540}
      >
        <Form
          form={taskForm}
          layout="vertical"
          onFinish={handleSaveTask}
          initialValues={{ priority: 'MEDIUM', status: createInitialStatus }}
          className="mt-4 flex flex-col gap-1"
        >
          {requireProjectSelect && (
            <Form.Item
              name="projectId"
              label="Dự án"
              rules={[{ required: true, message: 'Vui lòng chọn dự án' }]}
            >
              <Select placeholder="Chọn dự án">
                {projectsList.map((p) => (
                  <Select.Option key={p.id} value={p.id}>
                    [{p.key}] {p.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item
            name="title"
            label="Tiêu đề công việc"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
          >
            <Input placeholder="Nhập tên công việc cần làm..." />
          </Form.Item>

          <Form.Item name="description" label="Mô tả chi tiết">
            <Input.TextArea rows={3} placeholder="Mô tả công việc (không bắt buộc)..." />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="status" label="Trạng thái">
              <Select>
                <Select.Option value="TODO">Cần làm</Select.Option>
                <Select.Option value="IN_PROGRESS">Đang làm</Select.Option>
                <Select.Option value="IN_REVIEW">Đang kiểm tra</Select.Option>
                <Select.Option value="DONE">Hoàn thành</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="priority" label="Độ ưu tiên">
              <Select>
                <Select.Option value="LOW">Thấp</Select.Option>
                <Select.Option value="MEDIUM">Trung bình</Select.Option>
                <Select.Option value="HIGH">Cao</Select.Option>
                <Select.Option value="CRITICAL">Khẩn cấp</Select.Option>
              </Select>
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="assigneeId" label="Người thực hiện">
              <Select placeholder="Chọn người thực hiện" allowClear>
                {effectiveMembersList.map((m) => (
                  <Select.Option key={m.userId} value={m.userId}>
                    {m.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="dueDate" label="Hạn hoàn thành">
              <DatePicker className="w-full" format="DD/MM/YYYY" placeholder="Chọn ngày" />
            </Form.Item>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-2">
            <Button onClick={() => setCreateModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={submittingTask} className="!bg-indigo-600">
              Tạo mới
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
