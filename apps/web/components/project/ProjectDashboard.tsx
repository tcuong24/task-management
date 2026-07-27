'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Tabs, Avatar, Button, Empty, Spin, Modal, Form, Input, Select, DatePicker, App, Tooltip } from 'antd';
import {
  CheckCircleOutlined,
  SyncOutlined,
  PlusCircleOutlined,
  WarningOutlined,
  ShareAltOutlined,
  SettingOutlined,
  FullscreenOutlined,
} from '@ant-design/icons';
import { Pie, Column } from '@ant-design/charts';
import dayjs from 'dayjs';
import * as projectService from '../../services/project';
import type { ProjectDashboardData } from '../../services/project';
import * as orgService from '../../services/organization';
import * as taskService from '../../services/task';
import { KanbanBoard, TaskItem } from '../kanban/KanbanBoard';
import { TaskListView } from './TaskListView';
import { TaskCalendarView } from './TaskCalendarView';
import { TaskTimelineView } from './TaskTimelineView';
import { usePresence } from '../../hooks/usePresence';
import { useTaskRealtimeSync } from '../../hooks/useTaskRealtimeSync';

const STATUS_LABEL_MAP: Record<string, string> = {
  TODO: 'Cần làm',
  IN_PROGRESS: 'Đang làm',
  IN_REVIEW: 'Đang kiểm tra',
  DONE: 'Hoàn thành',
};

const PRIORITY_LABEL_MAP: Record<string, string> = {
  LOW: 'Thấp',
  MEDIUM: 'Trung bình',
  HIGH: 'Cao',
  CRITICAL: 'Khẩn cấp',
};

interface ProjectDashboardProps {
  projectId: string;
  orgId: string;
  initialDashboardData: ProjectDashboardData | null;
  project?: { id: string; name: string; key: string } | null;
}

export default function ProjectDashboard({ projectId, orgId, initialDashboardData, project }: ProjectDashboardProps) {
  const { message } = App.useApp();
  const [activeTab, setActiveTab] = useState('summary');
  const [boardTasks, setBoardTasks] = useState<TaskItem[]>([]);
  const [boardLoading, setBoardLoading] = useState<boolean>(false);
  const [timelineTasks, setTimelineTasks] = useState<TaskItem[]>([]);
  const [timelineLoading, setTimelineLoading] = useState<boolean>(false);
  const [membersList, setMembersList] = useState<{ userId: string; name: string }[]>([]);

  // Quick Create Modal from Calendar cell click
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [calendarSubmitting, setCalendarSubmitting] = useState(false);
  const [calendarForm] = Form.useForm();

  const [data, setData] = useState<ProjectDashboardData | null>(initialDashboardData);

  const { activeUsers } = usePresence(projectId ? `project:${projectId}` : undefined);

  useTaskRealtimeSync({
    projectId,
    onRefresh: () => {
      fetchProjectTasks();
      if (activeTab === 'timeline') {
        fetchProjectTimeline();
      }
    },
  });

  const tabItems = [
    { key: 'summary', label: 'Tổng quan' },
    { key: 'board', label: 'Bảng (Kanban)' },
    { key: 'list', label: 'Danh sách' },
    { key: 'timeline', label: 'Mốc thời gian' },
  ];

  const fetchMembers = useCallback(async () => {
    if (!orgId) return;
    try {
      const res = await orgService.getMembers(orgId);
      if (res.success && res.members) {
        setMembersList(
          res.members.map((m: any) => ({
            userId: m.userId,
            name: m.user?.fullName || m.user?.username || m.userId,
          }))
        );
      }
    } catch (err) {
      console.error('Error fetching members:', err);
    }
  }, [orgId]);

  const fetchProjectTasks = useCallback(async () => {
    if (!orgId || !projectId) return;
    try {
      setBoardLoading(true);
      const res = await taskService.getProjectTasks(orgId, projectId);
      if (res.success) {
        setBoardTasks(res.tasks as unknown as TaskItem[]);
      }
    } catch (err) {
      console.error('Error fetching project tasks:', err);
    } finally {
      setBoardLoading(false);
    }
  }, [orgId, projectId]);

  const fetchProjectTimeline = useCallback(async () => {
    if (!orgId || !projectId) return;
    try {
      setTimelineLoading(true);
      const res = await projectService.getProjectTimeline(orgId, projectId);
      if (res.success && res.tasks) {
        setTimelineTasks(res.tasks as unknown as TaskItem[]);
      }
    } catch (err) {
      console.error('Error fetching project timeline:', err);
    } finally {
      setTimelineLoading(false);
    }
  }, [orgId, projectId]);

  useEffect(() => {
    if (activeTab === 'timeline') {
      fetchProjectTimeline();
      fetchMembers();
    } else if (activeTab === 'board' || activeTab === 'list') {
      fetchProjectTasks();
      fetchMembers();
    }
  }, [activeTab, fetchProjectTasks, fetchProjectTimeline, fetchMembers]);

  const handleStatusChange = async (task: TaskItem, newStatus: TaskItem['status']) => {
    setBoardTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );
    try {
      await taskService.moveTask(orgId, projectId, task.id, newStatus, 0);
    } catch (err) {
      console.error('Error moving task:', err);
      fetchProjectTasks();
    }
  };

  const handleTaskSave = async (taskData: any) => {
    if (taskData.id) {
      await taskService.updateTask(orgId, projectId, taskData.id, taskData);
    } else {
      await taskService.createTask(orgId, projectId, taskData);
    }
    fetchProjectTasks();
    if (activeTab === 'timeline') {
      fetchProjectTimeline();
    }
  };

  const handleTaskDelete = async (task: TaskItem) => {
    await taskService.deleteTask(orgId, projectId, task.id);
    fetchProjectTasks();
  };

  const handleOpenCalendarCreateModal = (dueDateStr: string) => {
    calendarForm.resetFields();
    calendarForm.setFieldsValue({
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: dayjs(dueDateStr),
    });
    setCalendarModalOpen(true);
  };

  const handleCalendarCreateSubmit = async (values: any) => {
    try {
      setCalendarSubmitting(true);
      await taskService.createTask(orgId, projectId, {
        title: values.title,
        description: values.description,
        status: values.status || 'TODO',
        priority: values.priority || 'MEDIUM',
        assigneeId: values.assigneeId,
        dueDate: values.dueDate ? values.dueDate.toISOString() : null,
      });
      message.success('Tạo công việc thành công!');
      setCalendarModalOpen(false);
      calendarForm.resetFields();
      fetchProjectTasks();
    } catch (err: any) {
      message.error(err.message || 'Không thể tạo công việc.');
    } finally {
      setCalendarSubmitting(false);
    }
  };

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  const statusOverviewData = (data.statusOverview || []).map((item: any) => ({
    ...item,
    statusLabel: STATUS_LABEL_MAP[item.status] || item.status,
  }));

  const priorityBreakdownData = (data.priorityBreakdown || []).map((item: any) => ({
    ...item,
    priorityLabel: PRIORITY_LABEL_MAP[item.priority] || item.priority,
  }));

  const pieConfig = {
    data: statusOverviewData,
    angleField: 'count',
    colorField: 'statusLabel',
    innerRadius: 0.6,
    label: {
      text: 'count',
      style: {
        fontWeight: 'bold',
      },
    },
    legend: {
      color: {
        title: false,
        position: 'right',
        rowPadding: 5,
      },
    },
    theme: {
      styleSheet: {
        paletteQualitative10: ['#1890ff', '#13c2c2', '#fa8c16', '#52c41a'],
      },
    },
  };

  const columnConfig = {
    data: priorityBreakdownData,
    xField: 'priorityLabel',
    yField: 'count',
    label: {
      text: (d: any) => `${d.count}`,
      textBaseline: 'bottom',
    },
    colorField: 'priorityLabel',
    theme: {
      styleSheet: {
        paletteQualitative10: ['#ff4d4f', '#ff7a45', '#ffa940', '#7cb305'],
      },
    },
    legend: false as const,
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Area */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-xl uppercase">
              {(project?.name || 'P').charAt(0)}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 m-0">{project?.name || 'Chi tiết dự án'}</h1>
          </div>
          <div className="flex items-center gap-3">
            {activeUsers.length > 0 && (
              <div className="flex items-center gap-2 bg-indigo-50/70 px-3 py-1.5 rounded-full border border-indigo-100/80">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-semibold text-indigo-900">
                  {activeUsers.length} người đang xem
                </span>
                <Avatar.Group max={{ count: 3 }} size="small">
                  {activeUsers.map((u) => (
                    <Tooltip key={u.userId} title={u.fullName || u.username}>
                      <Avatar
                        src={u.avatarUrl || undefined}
                        style={{ backgroundColor: '#6366f1' }}
                      >
                        {(u.fullName || u.username || 'U').charAt(0).toUpperCase()}
                      </Avatar>
                    </Tooltip>
                  ))}
                </Avatar.Group>
              </div>
            )}
            <div className="h-6 w-px bg-gray-200 mx-1" />
            <Button icon={<ShareAltOutlined />}>Chia sẻ</Button>
            <Button icon={<SettingOutlined />}>Tự động hóa</Button>
            <Button icon={<FullscreenOutlined />} type="text" />
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            className="mb-0"
            tabBarStyle={{ marginBottom: 0 }}
          />
        </div>
      </div>

      {/* Content Area */}
      {activeTab === 'board' ? (
        <KanbanBoard
          tasks={boardTasks}
          loading={boardLoading}
          showProjectBadge={false}
          defaultProjectId={projectId}
          requireProjectSelect={false}
          membersList={membersList}
          onStatusChange={handleStatusChange}
          onTaskSave={handleTaskSave}
          onTaskDelete={handleTaskDelete}
        />
      ) : activeTab === 'list' ? (
        <TaskListView
          tasks={boardTasks}
          loading={boardLoading}
          membersList={membersList}
          onStatusChange={handleStatusChange}
          onTaskSave={handleTaskSave}
          onTaskDelete={handleTaskDelete}
          onRefresh={fetchProjectTasks}
        />
      ) : activeTab === 'timeline' ? (
        <TaskTimelineView
          tasks={timelineTasks}
          loading={timelineLoading}
          membersList={membersList}
          onOpenCreateModal={() => handleOpenCalendarCreateModal(dayjs().format('YYYY-MM-DD'))}
          onTaskSave={handleTaskSave}
        />
      ) : activeTab === 'summary' ? (
        <div className="flex flex-col gap-6 animate-fade-in">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card size="small" className="shadow-sm border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-500">
                  <CheckCircleOutlined className="text-xl" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{data.stats.completed}</div>
                  <div className="text-xs text-gray-500">Hoàn thành trong 7 ngày qua</div>
                </div>
              </div>
            </Card>

            <Card size="small" className="shadow-sm border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                  <SyncOutlined className="text-xl" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{data.stats.updated}</div>
                  <div className="text-xs text-gray-500">Cập nhật trong 7 ngày qua</div>
                </div>
              </div>
            </Card>

            <Card size="small" className="shadow-sm border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500">
                  <PlusCircleOutlined className="text-xl" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{data.stats.created}</div>
                  <div className="text-xs text-gray-500">Tạo mới trong 7 ngày qua</div>
                </div>
              </div>
            </Card>

            <Card size="small" className="shadow-sm border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
                  <WarningOutlined className="text-xl" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{data.stats.dueSoon}</div>
                  <div className="text-xs text-gray-500">Sắp đến hạn trong 7 ngày tới</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Overview */}
            <Card title="Tổng quan trạng thái" className="shadow-sm border-gray-100" styles={{ body: { height: 300 } }}>
              {data.statusOverview.length > 0 ? (
                <Pie {...pieConfig} />
              ) : (
                <Empty description="Không có dữ liệu công việc" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>

            {/* Priority Breakdown */}
            <Card title="Phân bố độ ưu tiên" className="shadow-sm border-gray-100" styles={{ body: { height: 300 } }}>
              {data.priorityBreakdown.length > 0 ? (
                <Column {...columnConfig} />
              ) : (
                <Empty description="Không có dữ liệu công việc" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-600 mb-1">Coming Soon</h3>
            <p className="text-gray-400 text-sm">Nội dung của tab "{tabItems.find((t: any) => t.key === activeTab)?.label}" đang được phát triển.</p>
          </div>
        </div>
      )}

      {/* Calendar Quick Create Modal */}
      <Modal
        title={<div className="flex items-center gap-2 text-gray-800 text-lg font-bold">Tạo công việc mới (từ Lịch)</div>}
        open={calendarModalOpen}
        onCancel={() => {
          setCalendarModalOpen(false);
          calendarForm.resetFields();
        }}
        footer={null}
        centered
        width={540}
      >
        <Form
          form={calendarForm}
          layout="vertical"
          onFinish={handleCalendarCreateSubmit}
          className="mt-4 flex flex-col gap-1"
        >
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
                {membersList.map((m) => (
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
            <Button onClick={() => setCalendarModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={calendarSubmitting} className="!bg-indigo-600">
              Tạo mới
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
