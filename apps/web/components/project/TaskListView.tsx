"use client";

import React, { useState, useMemo } from "react";
import {
  Table,
  Tag,
  Avatar,
  Input,
  Select,
  Button,
  Popconfirm,
  App,
  Spin,
} from "antd";
import {
  SearchOutlined,
  FilterOutlined,
  DeleteOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  DownOutlined,
  RightOutlined,
  CloseOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useParams, useRouter } from "next/navigation";
import type { TaskItem } from "../kanban/KanbanBoard";
import * as taskService from "../../services/task";

interface TaskListViewProps {
  tasks: TaskItem[];
  loading: boolean;
  membersList?: { userId: string; name: string }[];
  onStatusChange: (task: TaskItem, newStatus: TaskItem["status"]) => void;
  onTaskSave: (data: any) => Promise<void>;
  onTaskDelete?: (task: TaskItem) => Promise<void>;
  onRefresh?: () => void;
}

const PRIORITY_BADGES: Record<TaskItem["priority"], string> = {
  LOW: "!bg-slate-100 !text-slate-500",
  MEDIUM: "!bg-blue-50 !text-blue-700",
  HIGH: "!bg-orange-100 !text-orange-700",
  CRITICAL: "!bg-red-100 !text-red-700 font-bold",
};

const PRIORITY_LABELS: Record<TaskItem["priority"], string> = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
  CRITICAL: "Khẩn cấp",
};

const PRIORITY_ORDER: Record<TaskItem["priority"], number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const STATUS_LABELS: Record<TaskItem["status"], string> = {
  TODO: "Cần làm",
  IN_PROGRESS: "Đang làm",
  IN_REVIEW: "Đang kiểm tra",
  DONE: "Hoàn thành",
};

const STATUS_ORDER: Record<TaskItem["status"], number> = {
  TODO: 1,
  IN_PROGRESS: 2,
  IN_REVIEW: 3,
  DONE: 4,
};

const AVATAR_PALETTE = [
  "#10B981",
  "#3B82F6",
  "#6366F1",
  "#8B5CF6",
  "#EC4899",
  "#F59E0B",
  "#EF4444",
  "#06B6D4",
];

function getUserAvatarColor(id?: string | null): string {
  if (!id) return "#9CA3AF";
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length] || "#9CA3AF";
}

export function TaskListView({
  tasks,
  loading,
  membersList = [],
  onStatusChange,
  onTaskSave,
  onTaskDelete,
  onRefresh,
}: TaskListViewProps) {
  const { message } = App.useApp();
  const params = useParams();
  const router = useRouter();

  const orgSlug = (params?.orgSlug as string) || "";
  const projectKey = (params?.projectKey as string) || "";

  // Filter States
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([]);

  // Group By State: 'status' | 'assignee' | 'priority' | 'none'
  const [groupBy, setGroupBy] = useState<
    "status" | "assignee" | "priority" | "none"
  >("status");
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});

  // Selection & Bulk actions
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Search
      if (searchText.trim()) {
        const q = searchText.toLowerCase().trim();
        const code = (
          t.displayCode || `${t.project?.key}-${t.taskNumber}`
        ).toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchCode = code.includes(q);
        if (!matchTitle && !matchCode) return false;
      }
      // Status
      if (statusFilter.length > 0 && !statusFilter.includes(t.status)) {
        return false;
      }
      // Priority
      if (priorityFilter.length > 0 && !priorityFilter.includes(t.priority)) {
        return false;
      }
      // Assignee
      if (assigneeFilter.length > 0) {
        const aId = t.assigneeId || "unassigned";
        if (!assigneeFilter.includes(aId)) return false;
      }
      return true;
    });
  }, [tasks, searchText, statusFilter, priorityFilter, assigneeFilter]);

  // Group tasks
  const groupedTasks = useMemo(() => {
    if (groupBy === "none") {
      return [{ key: "all", title: "Tất cả công việc", tasks: filteredTasks }];
    }

    if (groupBy === "status") {
      const statuses: TaskItem["status"][] = [
        "TODO",
        "IN_PROGRESS",
        "IN_REVIEW",
        "DONE",
      ];
      return statuses.map((st) => ({
        key: st,
        title: STATUS_LABELS[st],
        tasks: filteredTasks.filter((t) => t.status === st),
      }));
    }

    if (groupBy === "priority") {
      const priorities: TaskItem["priority"][] = [
        "CRITICAL",
        "HIGH",
        "MEDIUM",
        "LOW",
      ];
      return priorities.map((pr) => ({
        key: pr,
        title: `Độ ưu tiên: ${PRIORITY_LABELS[pr]}`,
        tasks: filteredTasks.filter((t) => t.priority === pr),
      }));
    }

    if (groupBy === "assignee") {
      const map = new Map<string, { title: string; tasks: TaskItem[] }>();
      map.set("unassigned", { title: "Chưa phân công", tasks: [] });

      membersList.forEach((m) => {
        map.set(m.userId, { title: m.name, tasks: [] });
      });

      filteredTasks.forEach((t) => {
        const key = t.assigneeId || "unassigned";
        if (!map.has(key)) {
          const name = t.assignee?.fullName || t.assignee?.username || key;
          map.set(key, { title: name, tasks: [] });
        }
        map.get(key)!.tasks.push(t);
      });

      return Array.from(map.entries())
        .map(([key, value]) => ({
          key,
          title: value.title,
          tasks: value.tasks,
        }))
        .filter((g) => g.tasks.length > 0 || g.key === "unassigned");
    }

    return [{ key: "all", title: "Tất cả công việc", tasks: filteredTasks }];
  }, [filteredTasks, groupBy, membersList]);

  // Task click -> navigation to intercepting route
  const handleTaskClick = (t: TaskItem) => {
    const keyToUse = t.project?.key || projectKey;
    if (orgSlug && keyToUse) {
      router.push(`/dashboard/${orgSlug}/projects/${keyToUse}/tasks/${t.id}`);
    }
  };

  // Bulk Actions
  const handleBulkStatusChange = async (newStatus: TaskItem["status"]) => {
    if (selectedRowKeys.length === 0) return;
    try {
      setBulkLoading(true);
      const selectedIds = selectedRowKeys as string[];
      await Promise.all(
        selectedIds.map((id) => {
          const t = tasks.find((item) => item.id === id);
          if (t) return onStatusChange(t, newStatus);
          return Promise.resolve();
        }),
      );
      message.success(
        `Đã cập nhật trạng thái cho ${selectedIds.length} công việc.`,
      );
      setSelectedRowKeys([]);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      message.error(err.message || "Không thể cập nhật hàng loạt.");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkAssigneeChange = async (newAssigneeId: string | null) => {
    if (selectedRowKeys.length === 0) return;
    try {
      setBulkLoading(true);
      const selectedIds = selectedRowKeys as string[];
      await Promise.all(
        selectedIds.map((id) =>
          taskService.patchTask(id, { assigneeId: newAssigneeId }),
        ),
      );
      message.success(
        `Đã cập nhật người thực hiện cho ${selectedIds.length} công việc.`,
      );
      setSelectedRowKeys([]);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      message.error(err.message || "Không thể thay đổi người thực hiện.");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRowKeys.length === 0 || !onTaskDelete) return;
    try {
      setBulkLoading(true);
      const selectedIds = selectedRowKeys as string[];
      await Promise.all(
        selectedIds.map((id) => {
          const t = tasks.find((item) => item.id === id);
          if (t) return onTaskDelete(t);
          return Promise.resolve();
        }),
      );
      message.success(`Đã xóa ${selectedIds.length} công việc.`);
      setSelectedRowKeys([]);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      message.error(err.message || "Không thể xóa các công việc đã chọn.");
    } finally {
      setBulkLoading(false);
    }
  };

  // Table columns definition
  const columns = [
    {
      title: "Mã & Tên công việc",
      dataIndex: "title",
      key: "title",
      sorter: (a: TaskItem, b: TaskItem) => a.title.localeCompare(b.title),
      render: (_: any, record: TaskItem) => {
        const isDone = record.status === "DONE";
        const code =
          record.displayCode || `${record.project?.key}-${record.taskNumber}`;
        return (
          <div
            onClick={() => handleTaskClick(record)}
            className="flex items-center gap-2.5 cursor-pointer group py-1 min-w-0"
          >
            <span className="inline-flex items-center text-[11px] font-mono font-semibold text-gray-700 bg-slate-50 px-1.5 py-0.5 rounded border border-gray-200/80 flex-shrink-0">
              {isDone && (
                <CheckCircleFilled className="text-emerald-500 text-[11px] mr-1" />
              )}
              {code}
            </span>
            <span
              className={`text-sm font-semibold truncate transition-colors ${
                isDone
                  ? "line-through text-gray-400 font-normal"
                  : "text-gray-800 group-hover:text-gray-700"
              }`}
              title={record.title}
            >
              {record.title}
            </span>
          </div>
        );
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 140,
      sorter: (a: TaskItem, b: TaskItem) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status],
      render: (st: TaskItem["status"], record: TaskItem) => (
        <Select
          value={st}
          onChange={(val) => onStatusChange(record, val)}
          size="small"
          bordered={false}
          className="w-full text-xs font-medium"
          dropdownStyle={{ padding: 4 }}
        >
          <Select.Option value="TODO">Cần làm</Select.Option>
          <Select.Option value="IN_PROGRESS">Đang làm</Select.Option>
          <Select.Option value="IN_REVIEW">Đang kiểm tra</Select.Option>
          <Select.Option value="DONE">Hoàn thành</Select.Option>
        </Select>
      ),
    },
    {
      title: "Độ ưu tiên",
      dataIndex: "priority",
      key: "priority",
      width: 120,
      sorter: (a: TaskItem, b: TaskItem) =>
        PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority],
      render: (pr: TaskItem["priority"]) => (
        <Tag
          className={`m-0 text-[10px] border-none px-2 py-0.5 rounded-md font-semibold ${PRIORITY_BADGES[pr]}`}
        >
          {PRIORITY_LABELS[pr]}
        </Tag>
      ),
    },
    {
      title: "Người thực hiện",
      dataIndex: "assignee",
      key: "assignee",
      width: 160,
      render: (_: any, record: TaskItem) =>
        record.assignee ? (
          <div className="flex items-center gap-2 truncate">
            <Avatar
              size={22}
              src={record.assignee.avatarUrl || undefined}
              style={{
                backgroundColor: getUserAvatarColor(record.assignee.id),
              }}
              className="text-white font-bold text-[10px] flex-shrink-0"
            >
              {(record.assignee.fullName || record.assignee.username || "U")
                .charAt(0)
                .toUpperCase()}
            </Avatar>
            <span className="text-xs text-gray-700 truncate">
              {record.assignee.fullName || record.assignee.username}
            </span>
          </div>
        ) : (
          <span className="text-xs text-gray-400 italic">Chưa phân công</span>
        ),
    },
    {
      title: "Hạn hoàn thành",
      dataIndex: "dueDate",
      key: "dueDate",
      width: 140,
      sorter: (a: TaskItem, b: TaskItem) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return dayjs(a.dueDate).diff(dayjs(b.dueDate));
      },
      render: (date: string | null, record: TaskItem) => {
        if (!date) return <span className="text-xs text-gray-300">-</span>;
        const isOverdue =
          dayjs(date).isBefore(dayjs(), "day") && record.status !== "DONE";
        return (
          <span
            className={`inline-flex items-center gap-1 text-xs font-medium ${
              isOverdue ? "text-red-600 font-bold" : "text-gray-600"
            }`}
          >
            <ClockCircleOutlined className="text-[11px]" />
            {dayjs(date).format("DD/MM/YYYY")}
          </span>
        );
      },
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  };

  return (
    <div className="flex flex-col gap-4 relative">
      {/* Filter & Group Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm">
        {/* Left Search & Filters */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[300px]">
          <Input
            placeholder="Tìm theo mã hoặc tên task..."
            prefix={<SearchOutlined className="text-gray-400" />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            className="w-full sm:w-64 rounded-xl text-xs"
          />

          <Select
            mode="multiple"
            placeholder="Trạng thái"
            value={statusFilter}
            onChange={setStatusFilter}
            maxTagCount="responsive"
            className="min-w-[130px] text-xs"
            allowClear
          >
            <Select.Option value="TODO">Cần làm</Select.Option>
            <Select.Option value="IN_PROGRESS">Đang làm</Select.Option>
            <Select.Option value="IN_REVIEW">Đang kiểm tra</Select.Option>
            <Select.Option value="DONE">Hoàn thành</Select.Option>
          </Select>

          <Select
            mode="multiple"
            placeholder="Độ ưu tiên"
            value={priorityFilter}
            onChange={setPriorityFilter}
            maxTagCount="responsive"
            className="min-w-[130px] text-xs"
            allowClear
          >
            <Select.Option value="LOW">Thấp</Select.Option>
            <Select.Option value="MEDIUM">Trung bình</Select.Option>
            <Select.Option value="HIGH">Cao</Select.Option>
            <Select.Option value="CRITICAL">Khẩn cấp</Select.Option>
          </Select>

          <Select
            mode="multiple"
            placeholder="Người thực hiện"
            value={assigneeFilter}
            onChange={setAssigneeFilter}
            maxTagCount="responsive"
            className="min-w-[150px] text-xs"
            allowClear
          >
            <Select.Option value="unassigned">Chưa phân công</Select.Option>
            {membersList.map((m) => (
              <Select.Option key={m.userId} value={m.userId}>
                {m.name}
              </Select.Option>
            ))}
          </Select>

          {(searchText ||
            statusFilter.length > 0 ||
            priorityFilter.length > 0 ||
            assigneeFilter.length > 0) && (
            <Button
              size="small"
              type="text"
              onClick={() => {
                setSearchText("");
                setStatusFilter([]);
                setPriorityFilter([]);
                setAssigneeFilter([]);
              }}
              className="text-xs text-gray-500 hover:text-red-500"
            >
              Xóa bộ lọc
            </Button>
          )}
        </div>

        {/* Right Group By */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500">
            Nhóm theo:
          </span>
          <Select
            value={groupBy}
            onChange={setGroupBy}
            size="small"
            className="w-36 text-xs"
          >
            <Select.Option value="status">Trạng thái</Select.Option>
            <Select.Option value="priority">Độ ưu tiên</Select.Option>
            <Select.Option value="assignee">Người thực hiện</Select.Option>
            <Select.Option value="none">Không nhóm</Select.Option>
          </Select>
        </div>
      </div>

      {/* Floating Batch Action Toolbar */}
      {selectedRowKeys.length > 0 && (
        <div className="sticky top-4 z-20 bg-blue-700 text-white p-3 px-5 rounded-2xl shadow-xl border border-blue-700 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold bg-blue-700 px-2.5 py-1 rounded-lg">
              Đã chọn {selectedRowKeys.length} công việc
            </span>

            <div className="h-4 w-px bg-blue-700" />

            {/* Bulk Change Status */}
            <Select
              placeholder="Đổi trạng thái"
              size="small"
              onChange={handleBulkStatusChange}
              className="w-36 text-xs"
              disabled={bulkLoading}
            >
              <Select.Option value="TODO">Cần làm</Select.Option>
              <Select.Option value="IN_PROGRESS">Đang làm</Select.Option>
              <Select.Option value="IN_REVIEW">Đang kiểm tra</Select.Option>
              <Select.Option value="DONE">Hoàn thành</Select.Option>
            </Select>

            {/* Bulk Change Assignee */}
            <Select
              placeholder="Đổi người làm"
              size="small"
              onChange={handleBulkAssigneeChange}
              className="w-40 text-xs"
              disabled={bulkLoading}
            >
              <Select.Option value={null}>Bỏ phân công</Select.Option>
              {membersList.map((m) => (
                <Select.Option key={m.userId} value={m.userId}>
                  {m.name}
                </Select.Option>
              ))}
            </Select>

            {/* Bulk Delete */}
            <Popconfirm
              title={`Xóa ${selectedRowKeys.length} công việc đã chọn?`}
              onConfirm={handleBulkDelete}
              okText="Xóa"
              cancelText="Hủy"
            >
              <Button
                size="small"
                danger
                type="primary"
                icon={<DeleteOutlined />}
                loading={bulkLoading}
                className="rounded-lg text-xs"
              >
                Xóa các task chọn
              </Button>
            </Popconfirm>
          </div>

          <button
            onClick={() => setSelectedRowKeys([])}
            className="text-xs text-gray-300 hover:text-white flex items-center gap-1 cursor-pointer"
          >
            <CloseOutlined className="text-xs" /> Bỏ chọn
          </button>
        </div>
      )}

      {/* Main Collapsible Sections List */}
      {loading ? (
        <div className="flex justify-center py-20 bg-white rounded-2xl border border-gray-200">
          <Spin size="large" tip="Đang tải danh sách công việc..." />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groupedTasks.map((group) => {
            const isCollapsed = !!collapsedGroups[group.key];
            return (
              <div
                key={group.key}
                className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden transition-colors"
              >
                {/* Group Header */}
                <div
                  onClick={() => toggleGroupCollapse(group.key)}
                  className="px-5 py-3 bg-slate-50/70 hover:bg-slate-100/60 border-b border-gray-200/70 flex items-center justify-between cursor-pointer select-none transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    {isCollapsed ? (
                      <RightOutlined className="text-xs text-gray-400" />
                    ) : (
                      <DownOutlined className="text-xs text-gray-400" />
                    )}
                    <h3 className="text-sm font-bold text-gray-800 m-0">
                      {group.title}
                    </h3>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-50 text-gray-800 border border-gray-100">
                      {group.tasks.length}
                    </span>
                  </div>
                </div>

                {/* Group Table */}
                {!isCollapsed && (
                  <Table
                    rowSelection={rowSelection}
                    columns={columns}
                    dataSource={group.tasks}
                    rowKey="id"
                    pagination={false}
                    size="middle"
                    className="task-list-table"
                  />
                )}
              </div>
            );
          })}

          {filteredTasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-dashed border-gray-200 text-center gap-2">
              <span className="text-sm font-semibold text-gray-500">
                Không tìm thấy công việc nào
              </span>
              <span className="text-xs text-gray-400">
                Thử thay đổi từ khóa hoặc bộ lọc của bạn.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
