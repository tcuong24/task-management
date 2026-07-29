'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Tabs, Avatar, Button, Empty, Spin, Modal, Form, Input, Select, DatePicker, App, Tooltip, Dropdown, Switch } from 'antd';
import {
  CheckCircleOutlined,
  SyncOutlined,
  PlusCircleOutlined,
  WarningOutlined,
  ShareAltOutlined,
  SettingOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  CopyOutlined,
  UserAddOutlined,
  RobotOutlined,
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
import InviteMemberModal from '../organization/InviteMemberModal';

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

  // Invite Modal State
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  // Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Automation Modal State & Rules State
  const [automationModalOpen, setAutomationModalOpen] = useState(false);
  const [automationRules, setAutomationRules] = useState({
    autoStartDate: false,
    autoCompleteParent: false,
  });

  // Load automation rules
  useEffect(() => {
    if (typeof window !== 'undefined' && projectId) {
      const saved = localStorage.getItem(`taskflow:automation:${projectId}`);
      if (saved) {
        try {
          setAutomationRules(JSON.parse(saved));
        } catch (e) {
          console.error('Error parsing automation rules:', e);
        }
      }
    }
  }, [projectId]);

  const saveAutomationRules = (rules: typeof automationRules) => {
    setAutomationRules(rules);
    if (typeof window !== 'undefined' && projectId) {
      localStorage.setItem(`taskflow:automation:${projectId}`, JSON.stringify(rules));
    }
  };

  // Fullscreen handlers
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        message.error('Không thể kích hoạt chế độ toàn màn hình.');
        console.error(err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Share dropdown menu items
  const shareMenuItems = [
    {
      key: 'copy-link',
      label: 'Sao chép liên kết dự án',
      icon: <CopyOutlined />,
      onClick: () => {
        navigator.clipboard.writeText(window.location.href);
        message.success('Đã sao chép liên kết dự án vào bộ nhớ tạm!');
      },
    },
    {
      key: 'invite',
      label: 'Mời thành viên mới',
      icon: <UserAddOutlined />,
      onClick: () => setInviteModalOpen(true),
    },
  ];

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
            avatarUrl: m.user?.avatarUrl || null,
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
    // Determine if we need to auto-apply Start Date rule
    const shouldAutoStart = automationRules.autoStartDate && newStatus === 'IN_PROGRESS' && !task.startDate;

    setBoardTasks((prev) =>
      prev.map((t) => {
        if (t.id === task.id) {
          return {
            ...t,
            status: newStatus,
            ...(shouldAutoStart ? { startDate: new Date().toISOString() } : {}),
          };
        }
        return t;
      })
    );

    try {
      // First move the task status
      await taskService.moveTask(orgId, projectId, task.id, newStatus, 0);

      // If automation triggers, update the start date
      if (shouldAutoStart) {
        await taskService.updateTask(orgId, projectId, task.id, {
          startDate: new Date().toISOString(),
        });
        message.info('[Tự động hóa] Đã tự động đặt ngày bắt đầu là hôm nay.');
      }

      // Check Rule 2: Auto complete parent task when all subtasks are DONE
      if (automationRules.autoCompleteParent && newStatus === 'DONE' && task.parentTaskId) {
        // Find parent task in current board tasks
        const parentTask = boardTasks.find((t) => t.id === task.parentTaskId);
        if (parentTask && parentTask.subTasks && parentTask.subTasks.length > 0) {
          const allSiblingsDone = parentTask.subTasks.every((st) => {
            if (st.id === task.id) return true;
            return st.status === 'DONE';
          });

          if (allSiblingsDone && parentTask.status !== 'DONE') {
            await taskService.updateTask(orgId, projectId, parentTask.id, {
              status: 'DONE',
            });
            message.info('[Tự động hóa] Tất cả công việc con đã hoàn thành! Đã tự động hoàn thành công việc cha.');
            fetchProjectTasks();
          }
        }
      }
    } catch (err) {
      console.error('Error moving task:', err);
      fetchProjectTasks();
    }
  };

  const handleTaskSave = async (taskData: any) => {
    if (taskData.id) {
      const shouldAutoStart = automationRules.autoStartDate && taskData.status === 'IN_PROGRESS' && !taskData.startDate;
      const finalTaskData = shouldAutoStart
        ? { ...taskData, startDate: new Date().toISOString() }
        : taskData;

      await taskService.updateTask(orgId, projectId, taskData.id, finalTaskData);
      
      if (shouldAutoStart) {
        message.info('[Tự động hóa] Đã tự động đặt ngày bắt đầu là hôm nay.');
      }

      // Check Rule 2: Auto complete parent task when all subtasks are DONE
      if (automationRules.autoCompleteParent && taskData.status === 'DONE' && taskData.parentTaskId) {
        const parentTask = boardTasks.find((t) => t.id === taskData.parentTaskId);
        if (parentTask && parentTask.subTasks && parentTask.subTasks.length > 0) {
          const allSiblingsDone = parentTask.subTasks.every((st) => {
            if (st.id === taskData.id) return true;
            return st.status === 'DONE';
          });

          if (allSiblingsDone && parentTask.status !== 'DONE') {
            await taskService.updateTask(orgId, projectId, parentTask.id, {
              status: 'DONE',
            });
            message.info('[Tự động hóa] Tất cả công việc con đã hoàn thành! Đã tự động hoàn thành công việc cha.');
          }
        }
      }
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
            <Dropdown menu={{ items: shareMenuItems }} trigger={['click']} placement="bottomRight">
              <Button icon={<ShareAltOutlined />}>Chia sẻ</Button>
            </Dropdown>
            <Button icon={<RobotOutlined className="text-indigo-500" />} onClick={() => setAutomationModalOpen(true)}>
              Tự động hóa
            </Button>
            <Button
              icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              type="text"
              onClick={handleToggleFullscreen}
            />
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

      {/* Invite Member Modal */}
      <InviteMemberModal
        organizationId={orgId}
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onSuccess={() => {
          setInviteModalOpen(false);
          fetchMembers();
        }}
      />

      {/* Automation Rules Config Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-indigo-600">
            <RobotOutlined className="text-xl animate-bounce" />
            <span className="font-bold text-base">Quy tắc tự động hóa dự án</span>
          </div>
        }
        open={automationModalOpen}
        onCancel={() => setAutomationModalOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setAutomationModalOpen(false)} className="rounded-xl">
            Đóng
          </Button>
        ]}
        className="rounded-2xl"
        width={500}
      >
        <div className="py-4 flex flex-col gap-5">
          <p className="text-xs text-gray-500 -mt-2">
            Thiết lập các hành động tự động xử lý công việc khi có sự thay đổi trạng thái trong dự án.
          </p>

          <div className="flex flex-col gap-4 divide-y divide-gray-100">
            {/* Rule 1: Auto start date */}
            <div className="flex items-start justify-between gap-4 pt-3 first:pt-0">
              <div className="flex-1">
                <div className="text-xs font-bold text-gray-800">
                  Tự động cập nhật Ngày bắt đầu (Start Date) khi chuyển sang "Đang làm"
                </div>
                <div className="text-[11px] text-gray-500 mt-1">
                  Khi công việc được chuyển sang trạng thái "Đang làm" (IN_PROGRESS), tự động thiết lập ngày bắt đầu là hôm nay nếu trường này đang để trống.
                </div>
              </div>
              <Switch
                checked={automationRules.autoStartDate}
                onChange={(checked) => saveAutomationRules({ ...automationRules, autoStartDate: checked })}
                className="mt-1 shrink-0"
              />
            </div>

            {/* Rule 2: Auto parent done */}
            <div className="flex items-start justify-between gap-4 pt-4">
              <div className="flex-1">
                <div className="text-xs font-bold text-gray-800">
                  Tự động hoàn thành công việc cha khi tất cả công việc con hoàn thành
                </div>
                <div className="text-[11px] text-gray-500 mt-1">
                  Khi tất cả các công việc con (Subtasks) chuyển sang trạng thái "Hoàn thành" (DONE), công việc cha cũng tự động chuyển sang "Hoàn thành" (DONE).
                </div>
              </div>
              <Switch
                checked={automationRules.autoCompleteParent}
                onChange={(checked) => saveAutomationRules({ ...automationRules, autoCompleteParent: checked })}
                className="mt-1 shrink-0"
              />
            </div>

            {/* Rule 3: Auto escalate priority */}
            <div className="flex items-start justify-between gap-4 pt-4">
              <div className="flex-1">
                <div className="text-xs font-bold text-gray-800 opacity-60">
                  Tự động nâng mức độ ưu tiên sang Khẩn cấp (CRITICAL) khi quá hạn
                </div>
                <div className="text-[11px] text-gray-500 mt-1">
                  Tự động nâng mức ưu tiên của công việc khi thời gian hiện tại vượt quá hạn hoàn thành (Due Date).
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] bg-slate-100 text-gray-500 font-semibold px-2 py-0.5 rounded-full border border-gray-200">Sắp ra mắt</span>
                <Switch disabled checked={false} className="shrink-0" />
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
