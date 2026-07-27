'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Input, Select, Avatar, Spin, Button, Checkbox, App } from 'antd';
import { CustomTooltip as Tooltip } from '../common/CustomTooltip';
import {
  SearchOutlined,
  PlusOutlined,
  CheckCircleFilled,
  ControlOutlined,
  EllipsisOutlined,
  RightOutlined,
  LeftOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  CalendarOutlined,
  ThunderboltFilled,
  CaretDownFilled,
  CaretRightFilled,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { useParams, useRouter } from 'next/navigation';
import type { TaskItem } from '../kanban/KanbanBoard';

dayjs.extend(isBetween);

interface TaskTimelineViewProps {
  tasks: TaskItem[];
  loading: boolean;
  membersList?: { userId: string; name: string }[];
  onOpenCreateModal?: () => void;
  onTaskSave?: (taskData: any) => Promise<void>;
}

type ViewMode = 'Weeks' | 'Months' | 'Quarters';

// Exact Jira Soft Purple Palette (level 0 full, level 1 lighter opacity)
const STATUS_COLORS: Record<TaskItem['status'], { bg: string; bgSub: string; border: string; ring: string; text: string; label: string }> = {
  TODO: { bg: 'bg-[#b589fa]', bgSub: 'bg-[#b589fa]/70', border: 'border-[#a855f7]', ring: 'ring-[#9333ea]', text: 'text-white', label: 'Cần làm' },
  IN_PROGRESS: { bg: 'bg-[#9065f6]', bgSub: 'bg-[#9065f6]/70', border: 'border-[#7c3aed]', ring: 'ring-[#7c3aed]', text: 'text-white', label: 'Đang làm' },
  IN_REVIEW: { bg: 'bg-[#f59e0b]', bgSub: 'bg-[#f59e0b]/70', border: 'border-[#d97706]', ring: 'ring-[#d97706]', text: 'text-white', label: 'Đang kiểm tra' },
  DONE: { bg: 'bg-[#10b981]', bgSub: 'bg-[#10b981]/70', border: 'border-[#059669]', ring: 'ring-[#059669]', text: 'text-white', label: 'Hoàn thành' },
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

interface DragState {
  taskId: string;
  type: 'move' | 'resize-left' | 'resize-right';
  initialMouseX: number;
  initialTaskStart: Dayjs;
  initialTaskEnd: Dayjs;
}

interface FlattenedRow {
  task: TaskItem;
  level: number; // 0 = root, 1 = subtask
  hasSubtasks: boolean;
  isExpanded: boolean;
  parentId?: string | null;
}

export function TaskTimelineView({
  tasks,
  loading,
  membersList = [],
  onOpenCreateModal,
  onTaskSave,
}: TaskTimelineViewProps) {
  const { message } = App.useApp();
  const params = useParams();
  const router = useRouter();

  const orgSlug = (params?.orgSlug as string) || '';
  const projectKey = (params?.projectKey as string) || '';

  // Filter States
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);

  // View Mode: Weeks | Months | Quarters
  const [viewMode, setViewMode] = useState<ViewMode>('Months');

  // Zoom Level multiplier (default 1.5x for spacious timeline)
  const [zoomLevel, setZoomLevel] = useState<number>(1.5);

  // Timeline view range reference date
  const [baseDate, setBaseDate] = useState<Dayjs>(dayjs());

  // Expand / Collapse state for root tasks (Set of expanded task IDs)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    return new Set(tasks.map((t) => t.id));
  });

  // Keep expandedIds updated when new tasks arrive
  useEffect(() => {
    if (tasks && tasks.length > 0) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        tasks.forEach((t) => next.add(t.id));
        return next;
      });
    }
  }, [tasks]);

  const toggleExpand = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  // Currently hovered task ID for showing Jira-style date badges & drag handles
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);

  // Drag state & live task date overrides during dragging
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragDates, setDragDates] = useState<{ taskId: string; start: Dayjs; end: Dayjs } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Flatten root tasks & subtasks into visible rows depending on expandedIds & filters
  const visibleRows = useMemo(() => {
    const rows: FlattenedRow[] = [];

    tasks.forEach((rootTask) => {
      const subTasks = rootTask.subTasks || [];
      const hasSubtasks = subTasks.length > 0;
      const isExpanded = expandedIds.has(rootTask.id);

      // Check root task filter match
      const rootMatchesSearch = !searchText.trim() || (
        rootTask.title.toLowerCase().includes(searchText.toLowerCase().trim()) ||
        (rootTask.displayCode || `${rootTask.project?.key}-${rootTask.taskNumber}`).toLowerCase().includes(searchText.toLowerCase().trim())
      );
      const rootMatchesStatus = !statusFilter || rootTask.status === statusFilter;
      const rootMatchesAssignee = !selectedAssignee || rootTask.assigneeId === selectedAssignee;

      // Filter subtasks
      const matchingSubtasks = subTasks.filter((st) => {
        if (searchText.trim()) {
          const q = searchText.toLowerCase().trim();
          const code = (st.displayCode || `${st.project?.key || rootTask.project?.key}-${st.taskNumber}`).toLowerCase();
          const matchTitle = st.title.toLowerCase().includes(q);
          const matchCode = code.includes(q);
          if (!matchTitle && !matchCode) return false;
        }
        if (statusFilter && st.status !== statusFilter) return false;
        if (selectedAssignee && st.assigneeId !== selectedAssignee) return false;
        return true;
      });

      const shouldShowRoot = (rootMatchesSearch && rootMatchesStatus && rootMatchesAssignee) || matchingSubtasks.length > 0;

      if (shouldShowRoot) {
        // Add Root Task Row (Level 0)
        rows.push({
          task: rootTask,
          level: 0,
          hasSubtasks,
          isExpanded,
        });

        // Add Subtask Rows (Level 1) if root task is expanded
        if (isExpanded) {
          const subtasksToRender = (rootMatchesSearch && rootMatchesStatus && rootMatchesAssignee) ? subTasks : matchingSubtasks;
          subtasksToRender.forEach((st) => {
            rows.push({
              task: st,
              level: 1,
              hasSubtasks: false,
              isExpanded: false,
              parentId: rootTask.id,
            });
          });
        }
      }
    });

    return rows;
  }, [tasks, expandedIds, searchText, statusFilter, selectedAssignee]);

  // Determine timeline start and end dates based on viewMode & baseDate
  const { startDate, endDate, timeColumns } = useMemo(() => {
    let start = baseDate.startOf('year');
    let end = baseDate.endOf('year');
    const cols: { key: string; label: string; start: Dayjs; end: Dayjs; isCurrent?: boolean }[] = [];

    if (viewMode === 'Weeks') {
      start = baseDate.subtract(6, 'week').startOf('week');
      end = baseDate.add(6, 'week').endOf('week');
      let curr = start;
      while (curr.isBefore(end)) {
        const wEnd = curr.endOf('week');
        const isCurrent = dayjs().isBetween(curr, wEnd, 'day', '[]');
        cols.push({
          key: curr.format('YYYY-[W]WW'),
          label: `Tuần ${curr.format('WW')} (${curr.format('DD/MM')})`,
          start: curr,
          end: wEnd,
          isCurrent,
        });
        curr = curr.add(1, 'week');
      }
    } else if (viewMode === 'Months') {
      start = baseDate.subtract(4, 'month').startOf('month');
      end = baseDate.add(8, 'month').endOf('month');
      let curr = start;
      while (curr.isBefore(end)) {
        const mEnd = curr.endOf('month');
        const isCurrent = dayjs().isBetween(curr, mEnd, 'day', '[]');
        cols.push({
          key: curr.format('YYYY-MM'),
          label: curr.format('MMM YYYY'),
          start: curr,
          end: mEnd,
          isCurrent,
        });
        curr = curr.add(1, 'month');
      }
    } else {
      // Quarters
      start = baseDate.startOf('year');
      end = baseDate.endOf('year');
      let curr = start;
      for (let q = 1; q <= 4; q++) {
        const qEnd = curr.add(2, 'month').endOf('month');
        const isCurrent = dayjs().isBetween(curr, qEnd, 'day', '[]');
        cols.push({
          key: `Q${q}-${curr.year()}`,
          label: `Quý ${q} (${curr.format('MMM')} - ${qEnd.format('MMM')})`,
          start: curr,
          end: qEnd,
          isCurrent,
        });
        curr = curr.add(3, 'month');
      }
    }

    return { startDate: start, endDate: end, timeColumns: cols };
  }, [baseDate, viewMode]);

  // Column width calculated with zoom level for large, spacious timeline viewing
  const columnWidth = useMemo(() => {
    let base = 360;
    if (viewMode === 'Weeks') base = 280;
    if (viewMode === 'Months') base = 360;
    if (viewMode === 'Quarters') base = 520;
    return Math.round(base * zoomLevel);
  }, [viewMode, zoomLevel]);

  const matrixWidth = useMemo(() => {
    return timeColumns.length * columnWidth;
  }, [timeColumns.length, columnWidth]);

  const totalDays = useMemo(() => {
    return Math.max(1, endDate.diff(startDate, 'day'));
  }, [startDate, endDate]);

  const pxPerDay = useMemo(() => {
    return matrixWidth / totalDays;
  }, [matrixWidth, totalDays]);

  // Calculate today position percentage
  const todayPercent = useMemo(() => {
    const now = dayjs();
    if (now.isBefore(startDate)) return 0;
    if (now.isAfter(endDate)) return 100;
    const diff = now.diff(startDate, 'day');
    return (diff / totalDays) * 100;
  }, [startDate, endDate, totalDays]);

  const scrollToToday = useCallback(() => {
    if (containerRef.current) {
      const todayPx = (todayPercent / 100) * matrixWidth;
      containerRef.current.scrollTo({
        left: Math.max(0, todayPx - 300),
        behavior: 'smooth',
      });
    }
  }, [todayPercent, matrixWidth]);

  useEffect(() => {
    const timer = setTimeout(scrollToToday, 200);
    return () => clearTimeout(timer);
  }, [viewMode, baseDate, zoomLevel, scrollToToday]);

  // Mouse drag handling logic for horizontal dragging/resizing
  const handleMouseDown = (
    e: React.MouseEvent,
    task: TaskItem,
    type: 'move' | 'resize-left' | 'resize-right',
    taskStart: Dayjs,
    taskEnd: Dayjs
  ) => {
    e.stopPropagation();
    e.preventDefault();

    setDragState({
      taskId: task.id,
      type,
      initialMouseX: e.clientX,
      initialTaskStart: taskStart,
      initialTaskEnd: taskEnd,
    });

    setDragDates({
      taskId: task.id,
      start: taskStart,
      end: taskEnd,
    });
  };

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragState.initialMouseX;
      const daysDelta = Math.round(deltaX / pxPerDay);

      let newStart = dragState.initialTaskStart;
      let newEnd = dragState.initialTaskEnd;

      if (dragState.type === 'resize-right') {
        newEnd = dragState.initialTaskEnd.add(daysDelta, 'day');
        if (newEnd.isBefore(newStart.add(1, 'day'))) {
          newEnd = newStart.add(1, 'day');
        }
      } else if (dragState.type === 'resize-left') {
        newStart = dragState.initialTaskStart.add(daysDelta, 'day');
        if (newStart.isAfter(newEnd.subtract(1, 'day'))) {
          newStart = newEnd.subtract(1, 'day');
        }
      } else if (dragState.type === 'move') {
        newStart = dragState.initialTaskStart.add(daysDelta, 'day');
        newEnd = dragState.initialTaskEnd.add(daysDelta, 'day');
      }

      setDragDates({
        taskId: dragState.taskId,
        start: newStart,
        end: newEnd,
      });
    };

    const handleMouseUp = async () => {
      if (dragDates && onTaskSave) {
        try {
          await onTaskSave({
            id: dragDates.taskId,
            startDate: dragDates.start.toISOString(),
            dueDate: dragDates.end.toISOString(),
          });
          message.success('Cập nhật mốc thời gian thành công!');
        } catch (err: any) {
          message.error(err.message || 'Cập nhật mốc thời gian thất bại');
        }
      }
      setDragState(null);
      setDragDates(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, dragDates, pxPerDay, onTaskSave, message]);

  const handleTaskClick = (t: TaskItem) => {
    if (dragState) return;
    const keyToUse = t.project?.key || projectKey;
    if (orgSlug && keyToUse) {
      router.push(`/dashboard/${orgSlug}/projects/${keyToUse}/tasks/${t.id}`);
    }
  };

  const handleTodayClick = () => {
    setBaseDate(dayjs());
    scrollToToday();
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(3, prev + 0.25));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(0.75, prev - 0.25));
  };

  return (
    <div className="flex flex-col gap-4 relative">
      {/* Top Filter & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Timeline Input */}
          <Input
            placeholder="Search timeline..."
            prefix={<SearchOutlined className="text-gray-400" />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            className="w-48 sm:w-60 rounded-xl text-xs"
          />

          {/* Assignee Avatar Selector */}
          <div className="flex items-center gap-1.5">
            <Tooltip title="Tất cả người thực hiện">
              <button
                onClick={() => setSelectedAssignee(null)}
                className={`px-3 py-1 rounded-full flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                  !selectedAssignee
                    ? 'bg-gray-100 text-black shadow-sm ring-2 ring-indigo-500'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Tất cả
              </button>
            </Tooltip>
            {membersList.slice(0, 5).map((m) => {
              const isSelected = selectedAssignee === m.userId;
              return (
                <Tooltip key={m.userId} title={m.name}>
                  <Avatar
                    size={22}
                    style={{ backgroundColor: getUserAvatarColor(m.userId) }}
                    onClick={() => setSelectedAssignee(isSelected ? null : m.userId)}
                    className={`cursor-pointer transition-all text-xs! ${
                      isSelected ? 'ring-2 ring-indigo-500 scale-105' : 'hover:opacity-80'
                    }`}
                  >
                    {m.name.charAt(0).toUpperCase()}
                  </Avatar>
                </Tooltip>
              );
            })}
          </div>

          {/* Status Category Dropdown */}
          <Select
            placeholder="Status category"
            value={statusFilter}
            onChange={setStatusFilter}
            allowClear
            size="small"
            className="w-36 text-xs"
          >
            <Select.Option value="TODO">Cần làm</Select.Option>
            <Select.Option value="IN_PROGRESS">Đang làm</Select.Option>
            <Select.Option value="IN_REVIEW">Đang kiểm tra</Select.Option>
            <Select.Option value="DONE">Hoàn thành</Select.Option>
          </Select>
        </div>

        {/* Right Settings Icons */}
        <div className="flex items-center gap-2">
          <Button icon={<ControlOutlined />} size="small" type="text" className="text-gray-500" />
          <Button icon={<EllipsisOutlined />} size="small" type="text" className="text-gray-500" />
        </div>
      </div>

      {/* Main Split Timeline View */}
      {loading ? (
        <div className="flex justify-center py-24 bg-white rounded-2xl border border-gray-200">
          <Spin size="large" tip="Đang tải dữ liệu Timeline..." />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col relative min-h-[500px]">
          {/* Split Table Layout with Horizontal Scroll */}
          <div className="flex flex-1 overflow-x-auto relative scroll-smooth" ref={containerRef}>
            {/* Left Column - Tasks Tree List (Pinned Sticky Left Jira Style) */}
            <div className="w-[300px] md:w-[340px] border-r border-gray-200/80 bg-white flex flex-col shrink-0 sticky left-0 z-30 shadow-xs select-none">
              {/* Header */}
              <div className="h-12 px-4 border-b border-gray-200/80 bg-slate-50/70 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Tasks</span>
                {onOpenCreateModal && (
                  <button
                    onClick={onOpenCreateModal}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <PlusOutlined /> Create Task
                  </button>
                )}
              </div>

              {/* Hierarchical Task/Subtask Rows List */}
              <div className="flex flex-col divide-y divide-gray-100">
                {visibleRows.map(({ task: t, level, hasSubtasks, isExpanded }) => {
                  const isDone = t.status === 'DONE';
                  const code = t.displayCode || `${t.project?.key}-${t.taskNumber}`;
                  const isHovered = hoveredTaskId === t.id;

                  return (
                    <div
                      key={t.id}
                      onClick={() => handleTaskClick(t)}
                      onMouseEnter={() => setHoveredTaskId(t.id)}
                      onMouseLeave={() => setHoveredTaskId(null)}
                      style={{ paddingLeft: level === 1 ? '32px' : '12px' }}
                      className={`h-12 pr-3 flex items-center justify-between transition-colors cursor-pointer group ${
                        isHovered ? 'bg-slate-100/90' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {/* Level 0 Expand/Collapse Icon */}
                        {level === 0 ? (
                          hasSubtasks ? (
                            <button
                              onClick={(e) => toggleExpand(t.id, e)}
                              className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-transform cursor-pointer"
                            >
                              {isExpanded ? <CaretDownFilled className="text-[10px]" /> : <CaretRightFilled className="text-[10px]" />}
                            </button>
                          ) : (
                            <span className="w-4 h-4 inline-block shrink-0" />
                          )
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0 ml-1 mr-0.5" />
                        )}

                        <Checkbox className="scale-90" />
                        

                        <span
                          className={`truncate ${
                            level === 0
                              ? 'text-xs font-bold text-gray-900 group-hover:text-indigo-600'
                              : 'text-[11px] font-medium text-gray-600 group-hover:text-indigo-600'
                          } ${isDone ? 'line-through text-gray-400' : ''}`}
                          title={`${code} ${t.title}`}
                        >
                          [{code}] {t.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {t.assignee && (
                          <Avatar
                            size={18}
                            style={{ backgroundColor: getUserAvatarColor(t.assignee.id) }}
                            className="text-white text-[8px] font-bold shrink-0"
                          >
                            {(t.assignee.fullName || t.assignee.username || 'U').charAt(0).toUpperCase()}
                          </Avatar>
                        )}
                        <Button size="small" type="text" icon={<PlusOutlined />} className="text-gray-400 hover:text-gray-700 h-6 w-6 p-0" />
                        <Button size="small" type="text" icon={<EllipsisOutlined />} className="text-gray-400 hover:text-gray-700 h-6 w-6 p-0" />
                      </div>
                    </div>
                  );
                })}

                {visibleRows.length === 0 && (
                  <div className="h-40 flex items-center justify-center text-xs text-gray-400 italic">
                    Chưa có công việc nào.
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Large Zoomed Timeline Matrix Chart Area */}
            <div
              className="flex flex-col relative bg-white shrink-0 select-none"
              style={{ width: `${matrixWidth}px` }}
            >
              {/* Header Time Axis Columns */}
              <div className="h-12 border-b border-gray-200/80 bg-slate-50/70 flex text-xs font-bold text-gray-600 select-none relative">
                {timeColumns.map((col) => (
                  <div
                    key={col.key}
                    style={{ width: `${columnWidth}px` }}
                    className={`shrink-0 border-r border-gray-200/60 px-3 py-3 flex items-center justify-center text-center text-sm ${
                      col.isCurrent ? 'bg-indigo-50/60 text-gray-700 font-semibold' : 'font-medium'
                    }`}
                  >
                    {col.label}
                  </div>
                ))}
              </div>

              {/* Today Vertical Blue Indicator Line */}
              {todayPercent >= 0 && todayPercent <= 100 && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-blue-500 pointer-events-none z-20"
                  style={{ left: `${(todayPercent / 100) * matrixWidth}px` }}
                >
                  <div
                    className="absolute top-0 -ml-1.25 w-3 h-3 bg-blue-500 shadow-sm"
                    style={{
                      clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
                    }}
                  />
                </div>
              )}

              {/* Matrix Rows & Task/Subtask Bars */}
              <div className="flex flex-col divide-y divide-gray-100 flex-1 relative">
                {/* Vertical column gridlines background */}
                <div className="absolute inset-0 flex pointer-events-none">
                  {timeColumns.map((col) => (
                    <div
                      key={col.key}
                      style={{ width: `${columnWidth}px` }}
                      className={`shrink-0 border-r border-gray-100 ${
                        col.isCurrent ? 'bg-indigo-50/20' : ''
                      }`}
                    />
                  ))}
                </div>

                {/* Hierarchical Gantt Task Bars */}
                {visibleRows.map(({ task: t, level }) => {
                  const isBeingDragged = dragDates && dragDates.taskId === t.id;
                  
                  // Date range logic:
                  // 1. Both startDate & dueDate present -> full bar from startDate to dueDate
                  // 2. Only dueDate present -> marker point at dueDate
                  // 3. Only startDate present -> bar for 5 days from startDate
                  // 4. Neither present -> fallback 5 days from createdAt/today
                  const hasStart = Boolean(t.startDate);
                  const hasDue = Boolean(t.dueDate);
                  const isMarkerOnly = !hasStart && hasDue;

                  const rawStart = isBeingDragged ? dragDates.start : (t.startDate ? dayjs(t.startDate) : (t.createdAt ? dayjs(t.createdAt) : dayjs()));
                  const rawEnd = isBeingDragged ? dragDates.end : (t.dueDate ? dayjs(t.dueDate) : rawStart.add(5, 'day'));

                  let startDiff = rawStart.diff(startDate, 'day');
                  let duration = rawEnd.diff(rawStart, 'day');
                  if (duration < 1) duration = 1;

                  let leftPx = (startDiff / totalDays) * matrixWidth;
                  let widthPx = isMarkerOnly ? 36 : (duration / totalDays) * matrixWidth;

                  // If marker only, position at exact dueDate
                  if (isMarkerOnly && t.dueDate) {
                    const dueDiff = dayjs(t.dueDate).diff(startDate, 'day');
                    leftPx = (dueDiff / totalDays) * matrixWidth;
                  }

                  // Bound constraints
                  if (leftPx < 0) {
                    widthPx += leftPx;
                    leftPx = 0;
                  }
                  if (leftPx + widthPx > matrixWidth) {
                    widthPx = matrixWidth - leftPx;
                  }
                  if (!isMarkerOnly && widthPx < 45) widthPx = 45;

                  const stColor = STATUS_COLORS[t.status];
                  const code = t.displayCode || `${t.project?.key}-${t.taskNumber}`;
                  const isHovered = hoveredTaskId === t.id || isBeingDragged;

                  // Level 0 vs Level 1 Bar styles
                  const barBg = level === 0 ? stColor.bg : stColor.bgSub;
                  const barHeight = level === 0 ? 'h-7' : 'h-5';

                  return (
                    <div
                      key={t.id}
                      onMouseEnter={() => setHoveredTaskId(t.id)}
                      onMouseLeave={() => setHoveredTaskId(null)}
                      className={`h-12 relative flex items-center px-2 z-10 transition-colors ${
                        isHovered ? 'bg-slate-50/60' : ''
                      }`}
                    >
                      {/* Task/Subtask Bar Container */}
                      <div
                        style={{
                          left: `${leftPx}px`,
                          width: `${widthPx}px`,
                        }}
                        onMouseDown={(e) => handleMouseDown(e, t, 'move', rawStart, rawEnd)}
                        className={`absolute ${barHeight} rounded-md ${barBg} ${stColor.text} px-2.5 flex items-center justify-between text-xs font-bold shadow-sm cursor-grab active:cursor-grabbing transition-all border border-white/20 select-none ${
                          isHovered ? `ring-2 ${stColor.ring} shadow-md scale-[1.01]` : ''
                        } ${isMarkerOnly ? 'justify-center !rounded-full opacity-90' : ''}`}
                      >
                        {/* Top & Bottom Jira Connector Dots (on hover) */}
                        {isHovered && !isMarkerOnly && (
                          <>
                            <div className="w-2 h-2 rounded-full bg-[#c084fc] border border-white absolute left-1/2 -top-1 -ml-1 z-20" />
                            <div className="w-2 h-2 rounded-full bg-[#c084fc] border border-white absolute left-1/2 -bottom-1 -ml-1 z-20" />
                          </>
                        )}

                        {/* Left Drag Handle (Resizer) */}
                        {isHovered && !isMarkerOnly && (
                          <div
                            onMouseDown={(e) => handleMouseDown(e, t, 'resize-left', rawStart, rawEnd)}
                            className="w-1.5 h-4 bg-white/90 rounded-full border border-gray-400/40 cursor-ew-resize absolute left-1 top-1.5 z-30 hover:scale-125 transition-transform"
                            title="Kéo để chỉnh ngày bắt đầu"
                          />
                        )}

                        {/* Content inside bar */}
                        {isMarkerOnly ? (
                          <Tooltip title={`[${code}] Hạn hoàn thành: ${dayjs(t.dueDate).format('DD/MM/YYYY')}`}>
                            <CalendarOutlined className="text-white text-xs" />
                          </Tooltip>
                        ) : (
                          <span className="truncate flex items-center gap-1.5 pointer-events-none z-10 text-[11px]">
                            {t.status === 'DONE' && <CheckCircleFilled className="text-white text-[10px]" />}
                            [{code}] {t.title}
                          </span>
                        )}

                        {/* Right Drag Handle (Resizer) */}
                        {isHovered && !isMarkerOnly && (
                          <div
                            onMouseDown={(e) => handleMouseDown(e, t, 'resize-right', rawStart, rawEnd)}
                            className="w-1.5 h-4 bg-white/90 rounded-full border border-gray-400/40 cursor-ew-resize absolute right-1 top-1.5 z-30 hover:scale-125 transition-transform"
                            title="Kéo để chỉnh hạn hoàn thành"
                          />
                        )}

                        {/* Jira-Style Left Hover Date Tooltip Badge */}
                        {isHovered && (
                          <div className="absolute -left-32 top-0 h-7 px-2.5 bg-gray-900 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-md z-40 pointer-events-none animate-fade-in whitespace-nowrap">
                            <CalendarOutlined className="text-purple-300 text-[10px]" />
                            {hasStart ? rawStart.format('MMM DD, YYYY') : (t.dueDate ? `Marker (${dayjs(t.dueDate).format('DD/MM')})` : 'Tự động')}
                          </div>
                        )}

                        {/* Jira-Style Right Hover Date Tooltip Badge */}
                        {isHovered && (
                          <div className="absolute -right-44 top-0 h-7 px-2.5 bg-gray-900 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-md z-40 pointer-events-none animate-fade-in whitespace-nowrap">
                            <CalendarOutlined className="text-purple-300 text-[10px]" />
                            {rawEnd.format('MMM DD, YYYY')} ({duration} ngày)
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Right Floating Control Bar with Zoom Controls */}
          <div className="absolute bottom-4 right-6 z-40 bg-white/95 backdrop-blur-md rounded-2xl border border-gray-200 shadow-lg p-1.5 flex items-center gap-1.5 select-none">
            <Button
              size="small"
              type="text"
              onClick={handleTodayClick}
              className="text-xs font-semibold text-gray-700 hover:text-indigo-600 px-3"
            >
              Today
            </Button>

            <div className="h-4 w-px bg-gray-200 mx-0.5" />

            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <Button
                size="small"
                icon={<ZoomOutOutlined />}
                type="text"
                onClick={handleZoomOut}
                title="Thu nhỏ"
                className="text-gray-500 hover:text-gray-900"
              />
              <span className="text-[11px] font-bold text-gray-600 min-w-[36px] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <Button
                size="small"
                icon={<ZoomInOutlined />}
                type="text"
                onClick={handleZoomIn}
                title="Phóng to"
                className="text-gray-500 hover:text-gray-900"
              />
            </div>

            <div className="h-4 w-px bg-gray-200 mx-0.5" />

            {/* View Modes */}
            <div className="flex items-center bg-gray-100/80 p-0.5 rounded-xl">
              {(['Weeks', 'Months', 'Quarters'] as ViewMode[]).map((mode) => {
                const isActive = viewMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white text-indigo-600 shadow-xs border border-gray-200/60'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>

            <div className="h-4 w-px bg-gray-200 mx-0.5" />

            <Button
              size="small"
              icon={<LeftOutlined />}
              type="text"
              onClick={() => setBaseDate((prev) => prev.subtract(1, 'month'))}
              className="text-gray-400 hover:text-gray-700"
            />
            <Button
              size="small"
              icon={<RightOutlined />}
              type="text"
              onClick={() => setBaseDate((prev) => prev.add(1, 'month'))}
              className="text-gray-400 hover:text-gray-700"
            />
          </div>
        </div>
      )}
    </div>
  );
}
