"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Spin,
  Tag,
  Select,
  DatePicker,
  Avatar,
  Input,
  Checkbox,
  Button,
  App,
  Popconfirm,
  Tooltip,
} from "antd";
import {
  CloseOutlined,
  UserOutlined,
  SendOutlined,
  PlusOutlined,
  CheckSquareOutlined,
  PaperClipOutlined,
  HistoryOutlined,
  ProjectOutlined,
  LinkOutlined,
  UploadOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/vi";
import { useParams, useRouter } from "next/navigation";
import * as taskService from "../../services/task";
import * as orgService from "../../services/organization";
import { useAuth } from "../../hooks/useAuth";
import { useOrg } from "../../contexts/OrgContext";
import { usePresence } from "../../hooks/usePresence";
import { useTaskRealtimeSync } from "../../hooks/useTaskRealtimeSync";
import { usePlatformSettings } from "../../contexts/PlatformSettingsContext";

dayjs.extend(relativeTime);
dayjs.locale("vi");

export interface TaskDetailContentProps {
  taskId: string;
  onClose?: () => void;
  isStandalone?: boolean;
  onTaskUpdated?: () => void;
  onOpenTask?: (taskId: string) => void;
}

const PRIORITY_BADGES: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  LOW: { bg: "bg-slate-100", text: "text-slate-500", label: "Thấp" },
  MEDIUM: { bg: "bg-blue-50", text: "text-blue-700", label: "Trung bình" },
  HIGH: { bg: "bg-orange-100", text: "text-orange-700", label: "Cao" },
  CRITICAL: { bg: "bg-red-100", text: "text-red-700", label: "Khẩn cấp" },
};

const STATUS_LABELS: Record<string, string> = {
  TODO: "Cần làm",
  IN_PROGRESS: "Đang làm",
  IN_REVIEW: "Đang kiểm tra",
  DONE: "Hoàn thành",
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

export function TaskDetailContent({
  taskId,
  onClose,
  isStandalone = false,
  onTaskUpdated,
  onOpenTask,
}: TaskDetailContentProps) {
  const { message, modal } = App.useApp();
  const { user } = useAuth();
  const { userRole } = useOrg();
  const { settings: platformSettings } = usePlatformSettings();
  const params = useParams();
  const router = useRouter();

  const orgSlug = (params?.orgSlug as string) || "";
  const projectKey = (params?.projectKey as string) || "";

  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<taskService.TaskDetail | null>(null);
  const [membersList, setMembersList] = useState<
    { userId: string; name: string }[]
  >([]);

  // Editable fields state
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("");

  const [editingDesc, setEditingDesc] = useState(false);
  const [descInput, setDescInput] = useState("");

  // Subtask state
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [submittingSubtask, setSubmittingSubtask] = useState(false);

  // Comment input state
  const [commentInput, setCommentInput] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Attachment upload state
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Fetch Task Detail
  const fetchTaskDetail = useCallback(
    async (id: string) => {
      try {
        setLoading(true);
        const res = await taskService.getTaskDetail(id);
        if (res.success && res.task) {
          setTask(res.task);
          setTitleInput(res.task.title);
          setDescInput(res.task.description || "");

          // Fetch org members for assignee selection if org ID is available
          const canLoadMembers = userRole === "OWNER" || userRole === "ADMIN";
          if (canLoadMembers && res.task.project?.organizationId) {
            try {
              const orgRes = await orgService.getMembers(
                res.task.project.organizationId,
              );
              if (orgRes.success && orgRes.members) {
                setMembersList(
                  orgRes.members.map((m: any) => ({
                    userId: m.userId,
                    name: m.user?.fullName || m.user?.username || m.userId,
                  })),
                );
              }
            } catch (err) {
              console.error("Error fetching org members:", err);
            }
          }
        }
      } catch (err: any) {
        console.error("Error fetching task detail:", err);
        message.error(err.message || "Không thể tải thông tin công việc.");
      } finally {
        setLoading(false);
      }
    },
    [message],
  );

  const handleNavigateToTask = useCallback(
    (id: string) => {
      if (onClose) {
        onClose(); // Triggers the drawer close animation
        setTimeout(() => {
          if (onOpenTask) {
            onOpenTask(id);
          } else {
            router.push(
              `/dashboard/${orgSlug}/projects/${projectKey}/tasks/${id}`,
            );
          }
        }, 300); // 300ms matches standard Drawer transition duration
      } else {
        if (onOpenTask) {
          onOpenTask(id);
        } else {
          router.push(
            `/dashboard/${orgSlug}/projects/${projectKey}/tasks/${id}`,
          );
        }
      }
    },
    [onClose, onOpenTask, router, orgSlug, projectKey],
  );

  useEffect(() => {
    if (taskId) {
      fetchTaskDetail(taskId);
    }
  }, [taskId, fetchTaskDetail]);

  // Patch task helper with optimistic UI
  const handlePatchTask = async (
    patchData: Parameters<typeof taskService.patchTask>[1],
  ) => {
    if (!task) return;

    const previousTask = { ...task };
    setTask((prev) =>
      prev ? ({ ...prev, ...patchData } as taskService.TaskDetail) : null,
    );

    try {
      const res = await taskService.patchTask(task.id, patchData);
      if (res.success && res.task) {
        setTask((prev) =>
          prev
            ? ({
                ...prev,
                ...res.task,
                taskActivities: prev.taskActivities || [],
                comments: prev.comments || [],
                subTasks: prev.subTasks || [],
                attachments: prev.attachments || [],
              } as taskService.TaskDetail)
            : null,
        );
        setTitleInput(res.task.title);
        setDescInput(res.task.description || "");
        if (onTaskUpdated) onTaskUpdated();
      }
    } catch (err: any) {
      setTask(previousTask);
      message.error(err.message || "Không thể cập nhật công việc.");
    }
  };

  // Title save
  const handleSaveTitle = () => {
    setEditingTitle(false);
    if (titleInput.trim() && titleInput !== task?.title) {
      handlePatchTask({ title: titleInput.trim() });
    } else {
      setTitleInput(task?.title || "");
    }
  };

  // Description save
  const handleSaveDesc = () => {
    setEditingDesc(false);
    if (descInput !== task?.description) {
      handlePatchTask({ description: descInput.trim() || null });
    }
  };

  // Subtask handlers
  const handleToggleSubtask = async (
    subtaskId: string,
    currentStatus: string,
  ) => {
    const newStatus = currentStatus === "DONE" ? "TODO" : "DONE";
    try {
      await taskService.patchTask(subtaskId, { status: newStatus });
      fetchTaskDetail(taskId);
      if (onTaskUpdated) onTaskUpdated();
    } catch (err: any) {
      message.error(err.message || "Không thể cập nhật trạng thái subtask.");
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim() || !task) return;
    try {
      setSubmittingSubtask(true);
      await taskService.createDirectTask({
        projectId: task.projectId,
        title: newSubtaskTitle.trim(),
        parentTaskId: task.id,
      });
      setNewSubtaskTitle("");
      setAddingSubtask(false);
      fetchTaskDetail(task.id);
      if (onTaskUpdated) onTaskUpdated();
    } catch (err: any) {
      message.error(err.message || "Không thể tạo subtask mới.");
    } finally {
      setSubmittingSubtask(false);
    }
  };

  // Attachment handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !task) return;

    const maxBytes = platformSettings.max_upload_size_mb * 1024 * 1024;
    if (file.size > maxBytes) {
      message.error(`File không được vượt quá ${platformSettings.max_upload_size_mb} MB.`);
      e.target.value = "";
      return;
    }
    try {
      setUploadingAttachment(true);
      await taskService.uploadAttachment(task.id, file);
      message.success("Tải file đính kèm thành công!");
      fetchTaskDetail(task.id);
      if (onTaskUpdated) onTaskUpdated();
    } catch (err: any) {
      message.error(err.message || "Không thể tải file lên.");
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteAttachment = async (attId: string) => {
    if (!task) return;
    try {
      await taskService.deleteAttachment(attId);
      message.success("Đã xóa file đính kèm.");
      fetchTaskDetail(task.id);
      if (onTaskUpdated) onTaskUpdated();
    } catch (err: any) {
      message.error(err.message || "Không thể xóa file.");
    }
  };

  // Comment handler
  const handleAddComment = async () => {
    if (!commentInput.trim() || !task) return;
    try {
      setSubmittingComment(true);
      const res = await taskService.addComment(task.id, commentInput.trim());
      if (res.success) {
        setCommentInput("");
        fetchTaskDetail(task.id);
      }
    } catch (err: any) {
      message.error(err.message || "Không thể gửi bình luận.");
    } finally {
      setSubmittingComment(false);
    }
  };

  // Merge Timeline items (Comments + TaskActivities)
  const timelineItems = useMemo(() => {
    if (!task) return [];
    const items: {
      type: "activity" | "comment";
      id: string;
      createdAt: string;
      data: any;
    }[] = [];

    (task.taskActivities || []).forEach((act) => {
      items.push({
        type: "activity",
        id: act.id,
        createdAt: act.createdAt,
        data: act,
      });
    });

    (task.comments || []).forEach((cmt) => {
      items.push({
        type: "comment",
        id: cmt.id,
        createdAt: cmt.createdAt,
        data: cmt,
      });
    });

    return items.sort((a, b) => dayjs(a.createdAt).diff(dayjs(b.createdAt)));
  }, [task]);

  const renderActivityText = (act: taskService.TaskActivity) => {
    const actorName =
      act.actor?.fullName || act.actor?.username || "Người dùng";

    switch (act.action) {
      case "created":
        return (
          <span>
            <strong className="text-gray-900">{actorName}</strong> đã tạo công
            việc này
          </span>
        );
      case "status_changed":
        return (
          <span>
            <strong className="text-gray-900">{actorName}</strong> đã chuyển
            trạng thái từ{" "}
            <Tag color="blue" className="m-0 font-medium">
              {STATUS_LABELS[act.oldValue || ""] || act.oldValue}
            </Tag>{" "}
            →{" "}
            <Tag color="green" className="m-0 font-medium">
              {STATUS_LABELS[act.newValue || ""] || act.newValue}
            </Tag>
          </span>
        );
      case "priority_changed":
        return (
          <span>
            <strong className="text-gray-900">{actorName}</strong> đã thay đổi
            độ ưu tiên từ{" "}
            <span className="font-semibold text-gray-700">
              {PRIORITY_BADGES[act.oldValue || ""]?.label || act.oldValue}
            </span>{" "}
            →{" "}
            <span className="font-semibold text-gray-700">
              {PRIORITY_BADGES[act.newValue || ""]?.label || act.newValue}
            </span>
          </span>
        );
      case "assignee_changed":
        return (
          <span>
            <strong className="text-gray-900">{actorName}</strong> đã thay đổi
            người thực hiện sang{" "}
            <strong className="text-gray-700">
              {act.newValue || "Chưa giao"}
            </strong>
          </span>
        );
      case "due_date_changed":
        return (
          <span>
            <strong className="text-gray-900">{actorName}</strong> đã đổi hạn
            thành{" "}
            <span className="font-semibold text-gray-800">
              {act.newValue
                ? dayjs(act.newValue).format("DD/MM/YYYY")
                : "Không có"}
            </span>
          </span>
        );
      case "start_date_changed":
        return (
          <span>
            <strong className="text-gray-900">{actorName}</strong> đã đổi ngày
            bắt đầu thành{" "}
            <span className="font-semibold text-gray-800">
              {act.newValue
                ? dayjs(act.newValue).format("DD/MM/YYYY")
                : "Không có"}
            </span>
          </span>
        );
      case "title_changed":
        return (
          <span>
            <strong className="text-gray-900">{actorName}</strong> đã cập nhật
            tiêu đề công việc
          </span>
        );
      case "description_changed":
        return (
          <span>
            <strong className="text-gray-900">{actorName}</strong> đã chỉnh sửa
            mô tả
          </span>
        );
      default:
        return (
          <span>
            <strong className="text-gray-900">{actorName}</strong> thực hiện cập
            nhật
          </span>
        );
    }
  };

  const isAssigneeDisabled = useMemo(() => {
    if (!task) return false;
    if (userRole === "OWNER" || userRole === "ADMIN") return false;
    return userRole === "MEMBER" && task.reporterId !== user?.id;
  }, [userRole, task, user?.id]);

  const canDeleteTask =
    userRole === "OWNER" ||
    userRole === "ADMIN" ||
    task?.reporterId === user?.id;

  const handleDeleteTask = () => {
    if (!task || !task.project?.organizationId) return;
    const organizationId = task.project.organizationId;

    modal.confirm({
      title: "Xóa công việc?",
      content: `Công việc “${task.title}” sẽ được chuyển vào thùng rác.`,
      okText: "Xóa công việc",
      okType: "danger",
      cancelText: "Hủy",
      centered: true,
      async onOk() {
        try {
          await taskService.deleteTask(
            organizationId,
            task.projectId,
            task.id,
          );
          message.success("Đã chuyển công việc vào thùng rác.");
          onTaskUpdated?.();

          if (onClose) {
            onClose();
          } else {
            router.replace(`/dashboard/${orgSlug}/projects/${projectKey}`);
          }
        } catch (err: any) {
          message.error(err.message || "Không thể xóa công việc.");
          throw err;
        }
      },
    });
  };

  // Mỗi task là một presence room riêng. Danh sách này được cập nhật realtime
  // khi có người mở, đóng hoặc chuyển khỏi màn hình chi tiết task.
  const { activeUsers } = usePresence(taskId ? `task:${taskId}` : undefined);

  useTaskRealtimeSync({
    taskId,
    projectId: task?.projectId,
    onRefresh: () => {
      if (taskId && !editingTitle && !editingDesc) {
        fetchTaskDetail(taskId);
      }
    },
  });

  if (loading || !task) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-3 p-12">
        <Spin size="large" />
        <span className="text-sm font-medium text-gray-400">
          Đang tải chi tiết công việc...
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white text-left">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/50 sticky top-0 z-10 backdrop-blur-sm gap-3">
        <div className="flex flex-col gap-1 overflow-hidden">
          {task.parentTask && (
            <button
              onClick={() => handleNavigateToTask(task.parentTask!.id)}
              className="flex items-center gap-1 text-[11px] text-gray-700 hover:text-gray-900 font-bold mb-1.5 cursor-pointer bg-transparent border-none p-0 w-fit"
            >
              ← Quay lại [{task.parentTask.displayCode}] {task.parentTask.title}
            </button>
          )}
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 overflow-hidden">
            <ProjectOutlined className="text-gray-700 text-sm" />
            <span className="truncate">{task.project?.name || "Project"}</span>
            <span className="text-gray-300">/</span>
            <span className="px-2 py-0.5 rounded bg-gray-50 text-gray-800 font-mono font-semibold border border-gray-100">
              {task.displayCode}
            </span>
          </div>
          {/* Hiển thị tên những người hiện đang ở trong room của task. */}
          {activeUsers.length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>
                <strong className="font-semibold text-gray-700">
                  {activeUsers.map((u) => u.fullName || u.username).join(", ")}
                </strong>{" "}
                đang xem task này
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Dùng cùng activeUsers để hiển thị nhóm avatar người đang xem. */}
          {activeUsers.length > 0 && (
            <Avatar.Group max={{ count: 3 }} size="small">
              {activeUsers.map((u) => (
                <Tooltip key={u.userId} title={u.fullName || u.username}>
                  <Avatar
                    src={u.avatarUrl || undefined}
                    style={{ backgroundColor: getUserAvatarColor(u.userId) }}
                  >
                    {(u.fullName || u.username || "U").charAt(0).toUpperCase()}
                  </Avatar>
                </Tooltip>
              ))}
            </Avatar.Group>
          )}

          {canDeleteTask && (
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={handleDeleteTask}
              className="rounded-xl font-semibold"
            >
              Xóa
            </Button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors cursor-pointer"
            >
              <CloseOutlined className="text-xs" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
        {/* Left Main Column */}
        <div className="flex-1 p-6 flex flex-col gap-6 border-r border-gray-100">
          {/* Title */}
          <div className="flex flex-col gap-1">
            {editingTitle ? (
              <Input
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={handleSaveTitle}
                onPressEnter={handleSaveTitle}
                autoFocus
                className="text-lg font-bold text-gray-900 border-blue-500 shadow-sm"
              />
            ) : (
              <h2
                onClick={() => setEditingTitle(true)}
                className="text-xl font-bold text-gray-900 cursor-pointer hover:bg-gray-50 p-1.5 -ml-1.5 rounded-lg transition-colors leading-snug"
                title="Click để chỉnh sửa tiêu đề"
              >
                {task.title}
              </h2>
            )}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              Mô tả công việc
            </span>
            {editingDesc ? (
              <Input.TextArea
                rows={4}
                value={descInput}
                onChange={(e) => setDescInput(e.target.value)}
                onBlur={handleSaveDesc}
                autoFocus
                placeholder="Thêm mô tả chi tiết cho công việc..."
                className="text-sm text-gray-800 border-blue-500 shadow-sm rounded-xl"
              />
            ) : (
              <div
                onClick={() => setEditingDesc(true)}
                className="text-sm text-gray-700 cursor-pointer hover:bg-gray-50 p-3 -ml-1 rounded-xl transition-colors border border-transparent hover:border-gray-200 min-h-[72px] whitespace-pre-wrap"
              >
                {task.description || (
                  <span className="text-gray-400 italic text-xs">
                    Chưa có mô tả. Click vào đây để thêm...
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Subtasks */}
          {(() => {
            const subTasks = (task.subTasks ||
              []) as unknown as taskService.SubTaskSummary[];
            return (
              <div className="flex flex-col gap-3 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                    <CheckSquareOutlined className="text-gray-700" />
                    Subtasks (
                    {subTasks.filter((s) => s.status === "DONE").length}/
                    {subTasks.length})
                  </span>

                  <button
                    onClick={() => setAddingSubtask(true)}
                    className="text-xs font-bold text-gray-700 hover:text-gray-900 flex items-center gap-1 cursor-pointer"
                  >
                    <PlusOutlined /> Thêm subtask
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {subTasks.length > 0 && (
                    <div className="flex flex-col gap-0.5 rounded-xl bg-blue-50/20 border border-gray-100 divide-y divide-gray-100 overflow-hidden">
                      {subTasks.map((st) => {
                        const isDone = st.status === "DONE";
                        const assigneeName =
                          st.assignee?.fullName ||
                          st.assignee?.username ||
                          "Chưa gán";

                        return (
                          <div
                            key={st.id}
                            className="flex items-center gap-3 px-4 py-2.5 pl-6 hover:bg-blue-50/50 transition-colors group relative"
                          >
                            <Checkbox
                              checked={isDone}
                              onChange={() =>
                                handleToggleSubtask(st.id, st.status)
                              }
                              className="scale-105"
                            />

                            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                              {/* Title with link */}
                              <span
                                onClick={() => handleNavigateToTask(st.id)}
                                className={`text-xs font-semibold cursor-pointer hover:text-gray-700 hover:underline truncate ${
                                  isDone
                                    ? "line-through text-gray-400 font-normal"
                                    : "text-gray-800"
                                }`}
                                title={`Xem chi tiết: ${st.displayCode} - ${st.title}`}
                              >
                                <span className="text-gray-400 font-mono text-[10px] mr-1">
                                  └─
                                </span>
                                {st.title}
                              </span>

                              {/* Metadata row */}
                              <div className="flex items-center gap-2 text-[10px] text-gray-400 flex-wrap">
                                <span
                                  className={`px-1.5 py-0.5 rounded-md font-semibold text-[9px] ${
                                    st.priority === "CRITICAL"
                                      ? "bg-red-50 text-red-600 border border-red-100"
                                      : st.priority === "HIGH"
                                        ? "bg-amber-50 text-amber-700 border border-amber-100"
                                        : st.priority === "MEDIUM"
                                          ? "bg-blue-50 text-blue-600 border border-blue-100"
                                          : "bg-gray-50 text-gray-500 border border-gray-200"
                                  }`}
                                >
                                  {PRIORITY_BADGES[st.priority]?.label ||
                                    st.priority}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <UserOutlined className="text-[9px]" />
                                  {assigneeName}
                                </span>
                                <span>•</span>
                                <span
                                  className={
                                    st.dueDate &&
                                    dayjs(st.dueDate).isBefore(dayjs(), "day")
                                      ? "text-red-500 font-bold"
                                      : ""
                                  }
                                >
                                  {st.dueDate
                                    ? dayjs(st.dueDate).format("DD/MM/YYYY")
                                    : "Không có hạn"}
                                </span>
                              </div>
                            </div>

                            {/* Display Code */}
                            <span className="text-[10px] font-mono font-bold text-gray-400 select-none group-hover:text-gray-600 transition-colors">
                              {st.displayCode}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {addingSubtask && (
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        placeholder="Nhập tên subtask..."
                        size="small"
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        onPressEnter={handleAddSubtask}
                        autoFocus
                      />
                      <Button
                        size="small"
                        type="primary"
                        loading={submittingSubtask}
                        onClick={handleAddSubtask}
                      >
                        Tạo
                      </Button>
                      <Button
                        size="small"
                        onClick={() => setAddingSubtask(false)}
                      >
                        Hủy
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Attachments */}
          {(() => {
            const attachments = task.attachments || [];
            return (
              <div className="flex flex-col gap-2.5 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                    <PaperClipOutlined className="text-gray-700" />
                    Đính kèm ({attachments.length})
                  </span>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAttachment}
                    className="text-xs font-bold text-gray-700 hover:text-gray-900 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {uploadingAttachment ? (
                      <Spin size="small" />
                    ) : (
                      <UploadOutlined />
                    )}{" "}
                    Tải file lên
                  </button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept={platformSettings.allowed_file_types.join(",")}
                    className="hidden"
                  />
                </div>

                {attachments.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-gray-200/80 hover:bg-gray-50/40 hover:border-gray-200 transition-colors group"
                      >
                        <a
                          href={att.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 flex-1 min-w-0"
                        >
                          <PaperClipOutlined className="text-gray-700 text-sm flex-shrink-0" />
                          <span
                            className="text-xs font-medium text-gray-800 truncate"
                            title={att.originalName}
                          >
                            {att.originalName}
                          </span>
                        </a>

                        <Popconfirm
                          title="Xóa file đính kèm này?"
                          onConfirm={() => handleDeleteAttachment(att.id)}
                          okText="Xóa"
                          cancelText="Hủy"
                        >
                          <button className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 ml-1 cursor-pointer">
                            <DeleteOutlined className="text-xs" />
                          </button>
                        </Popconfirm>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-4 border border-dashed border-gray-200 rounded-xl bg-slate-50/50 hover:bg-gray-50/30 hover:border-gray-300 transition-colors cursor-pointer text-gray-400 text-xs gap-1"
                  >
                    <UploadOutlined className="text-base text-gray-400" />
                    <span>Chưa có file đính kèm. Click để tải lên...</span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Activity & Comment Timeline */}
          <div className="flex flex-col gap-4 pt-4 border-t border-gray-100 flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <HistoryOutlined className="text-gray-700" />
              Hoạt động & Bình luận
            </span>

            <div className="flex flex-col gap-3.5 pl-1">
              {timelineItems.map((item) => (
                <div key={item.id} className="flex gap-3 text-xs">
                  {item.type === "activity" ? (
                    <div className="flex gap-3 items-start w-full">
                      <Avatar
                        size="small"
                        src={item.data.actor?.avatarUrl || undefined}
                        style={{
                          backgroundColor: getUserAvatarColor(
                            item.data.actor?.id,
                          ),
                        }}
                        className="text-white flex-shrink-0 mt-0.5 font-bold text-[10px]"
                      >
                        {(
                          item.data.actor?.fullName ||
                          item.data.actor?.username ||
                          "U"
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </Avatar>
                      <div className="flex flex-col gap-0.5 text-gray-600">
                        <div>{renderActivityText(item.data)}</div>
                        <span className="text-[10px] text-gray-400">
                          {dayjs(item.createdAt).fromNow()}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3 items-start w-full">
                      <Avatar
                        size="small"
                        src={item.data.author?.avatarUrl || undefined}
                        style={{
                          backgroundColor: getUserAvatarColor(
                            item.data.author?.id,
                          ),
                        }}
                        className="text-white flex-shrink-0 mt-0.5 font-bold text-[10px]"
                      >
                        {(
                          item.data.author?.fullName ||
                          item.data.author?.username ||
                          "U"
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </Avatar>
                      <div className="flex flex-col gap-1 bg-slate-50 p-3 rounded-2xl border border-gray-100 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-900">
                            {item.data.author?.fullName ||
                              item.data.author?.username}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {dayjs(item.createdAt).fromNow()}
                          </span>
                        </div>
                        <p className="text-gray-800 m-0 whitespace-pre-wrap">
                          {item.data.content}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {timelineItems.length === 0 && (
                <div className="text-center text-xs text-gray-400 py-4">
                  Chưa có hoạt động nào.
                </div>
              )}
            </div>

            {/* Comment Input */}
            <div className="flex gap-2 items-center mt-auto pt-4 sticky bottom-0 bg-white">
              <Input
                placeholder="Viết bình luận..."
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onPressEnter={handleAddComment}
                className="rounded-xl text-xs py-2"
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={submittingComment}
                onClick={handleAddComment}
                className="rounded-xl flex-shrink-0 !bg-blue-600"
              >
                Gửi
              </Button>
            </div>
          </div>
        </div>

        {/* Right Side Properties Panel */}
        <div className="w-full md:w-[220px] p-6 bg-slate-50/40 flex flex-col gap-5 text-xs flex-shrink-0 border-t md:border-t-0 border-gray-100">
          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <span className="font-semibold text-gray-500">Trạng thái</span>
            <Select
              value={task.status}
              onChange={(val) => handlePatchTask({ status: val })}
              className="w-full"
            >
              <Select.Option value="TODO">Cần làm</Select.Option>
              <Select.Option value="IN_PROGRESS">Đang làm</Select.Option>
              <Select.Option value="IN_REVIEW">Đang kiểm tra</Select.Option>
              <Select.Option value="DONE">Hoàn thành</Select.Option>
            </Select>
          </div>

          {/* Priority */}
          <div className="flex flex-col gap-1.5">
            <span className="font-semibold text-gray-500">Độ ưu tiên</span>
            <Select
              value={task.priority}
              onChange={(val) => handlePatchTask({ priority: val })}
              className="w-full"
            >
              <Select.Option value="LOW">
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-500">
                  Thấp
                </span>
              </Select.Option>
              <Select.Option value="MEDIUM">
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700">
                  Trung bình
                </span>
              </Select.Option>
              <Select.Option value="HIGH">
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-100 text-orange-700">
                  Cao
                </span>
              </Select.Option>
              <Select.Option value="CRITICAL">
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-700 font-bold">
                  Khẩn cấp
                </span>
              </Select.Option>
            </Select>
          </div>

          {/* Assignee */}
          <div className="flex flex-col gap-1.5">
            <span className="font-semibold text-gray-500">Người thực hiện</span>
            <Select
              value={task.assigneeId || undefined}
              onChange={(val) => handlePatchTask({ assigneeId: val || null })}
              disabled={isAssigneeDisabled}
              allowClear
              placeholder="Chưa phân công"
              className="w-full"
            >
              {membersList.map((m) => (
                <Select.Option key={m.userId} value={m.userId}>
                  {m.name}
                </Select.Option>
              ))}
            </Select>
          </div>

          {/* Reporter */}
          <div className="flex flex-col gap-1.5">
            <span className="font-semibold text-gray-500">Người báo cáo</span>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-gray-200/70">
              <Avatar
                size="small"
                src={task.reporter?.avatarUrl || undefined}
                style={{
                  backgroundColor: getUserAvatarColor(task.reporter?.id),
                }}
                className="text-white font-bold text-[10px]"
              >
                {(task.reporter?.fullName || task.reporter?.username || "R")
                  .charAt(0)
                  .toUpperCase()}
              </Avatar>
              <span className="font-medium text-gray-800 truncate">
                {task.reporter?.fullName || task.reporter?.username}
              </span>
            </div>
          </div>

          {/* Start Date & Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="font-semibold text-gray-500">Ngày bắt đầu</span>
              <DatePicker
                value={task.startDate ? dayjs(task.startDate) : null}
                onChange={(date) =>
                  handlePatchTask({
                    startDate: date ? date.toISOString() : null,
                  })
                }
                format="DD/MM/YYYY"
                placeholder="Chọn ngày..."
                className="w-full!"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="font-semibold text-gray-500">
                Hạn hoàn thành
              </span>
              <DatePicker
                value={task.dueDate ? dayjs(task.dueDate) : null}
                onChange={(date) =>
                  handlePatchTask({ dueDate: date ? date.toISOString() : null })
                }
                format="DD/MM/YYYY"
                placeholder="Chọn ngày..."
                className="w-full!"
              />
            </div>
          </div>

          {/* Parent Task Link */}
          {task.parentTask && (
            <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-200/60">
              <span className="font-semibold text-gray-500">Task cha</span>
              <button
                onClick={() => handleNavigateToTask(task.parentTask!.id)}
                className="flex items-center gap-1.5 p-2 rounded-xl bg-gray-50/60 text-gray-800 font-medium hover:bg-gray-100 transition-colors text-left truncate cursor-pointer"
              >
                <LinkOutlined />
                <span className="truncate">
                  {task.parentTask.displayCode} · {task.parentTask.title}
                </span>
              </button>
            </div>
          )}

          {/* Creation Info */}
          <div className="flex flex-col gap-1 pt-3 border-t border-gray-200/60 text-[11px] text-gray-400 font-medium">
            <span>
              Tạo bởi: {task.reporter?.fullName || task.reporter?.username}
            </span>
            <span>
              Ngày tạo: {dayjs(task.createdAt).format("DD/MM/YYYY HH:mm")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
