'use client';

import React, { useState, useMemo } from 'react';
import { Button, Popover, Tag, Spin } from 'antd';
import CustomTooltip from '../common/CustomTooltip';
import {
  LeftOutlined,
  RightOutlined,
  PlusOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/vi';
import { useParams, useRouter } from 'next/navigation';
import type { TaskItem } from '../kanban/KanbanBoard';

dayjs.locale('vi');

interface TaskCalendarViewProps {
  tasks: TaskItem[];
  loading: boolean;
  onOpenCreateModalWithDate?: (dueDateStr: string) => void;
}

const STATUS_BADGES: Record<TaskItem['status'], { bg: string; text: string; label: string }> = {
  TODO: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Cần làm' },
  IN_PROGRESS: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Đang làm' },
  IN_REVIEW: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Kiểm tra' },
  DONE: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Hoàn thành' },
};

export function TaskCalendarView({
  tasks,
  loading,
  onOpenCreateModalWithDate,
}: TaskCalendarViewProps) {
  const params = useParams();
  const router = useRouter();

  const orgSlug = (params?.orgSlug as string) || '';
  const projectKey = (params?.projectKey as string) || '';

  const [currentDate, setCurrentDate] = useState<Dayjs>(dayjs());

  // Month navigation
  const handlePrevMonth = () => setCurrentDate((prev) => prev.subtract(1, 'month'));
  const handleNextMonth = () => setCurrentDate((prev) => prev.add(1, 'month'));
  const handleToday = () => setCurrentDate(dayjs());

  // Build calendar days array for grid (6 rows * 7 days = 42 cells)
  const calendarGrid = useMemo(() => {
    const startOfMonth = currentDate.startOf('month');
    const startOfWeek = startOfMonth.startOf('week'); // Sunday or Monday

    const days: Dayjs[] = [];
    let day = startOfWeek;

    for (let i = 0; i < 42; i++) {
      days.push(day);
      day = day.add(1, 'day');
    }

    return days;
  }, [currentDate]);

  // Group tasks by date string (YYYY-MM-DD)
  const tasksByDate = useMemo(() => {
    const map = new Map<string, TaskItem[]>();
    tasks.forEach((t) => {
      if (t.dueDate) {
        const dateKey = dayjs(t.dueDate).format('YYYY-MM-DD');
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(t);
      }
    });
    return map;
  }, [tasks]);

  const handleTaskClick = (t: TaskItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const keyToUse = t.project?.key || projectKey;
    if (orgSlug && keyToUse) {
      router.push(`/dashboard/${orgSlug}/projects/${keyToUse}/tasks/${t.id}`);
    }
  };

  const handleCellClick = (date: Dayjs) => {
    if (onOpenCreateModalWithDate) {
      onOpenCreateModalWithDate(date.format('YYYY-MM-DD'));
    }
  };

  const todayStr = dayjs().format('YYYY-MM-DD');
  const weekHeader = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  return (
    <div className="flex flex-col gap-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-gray-900 m-0 capitalize">
            {currentDate.format('MMMM [Năm] YYYY')}
          </h2>
          <Button size="small" onClick={handleToday} className="rounded-lg text-xs font-semibold">
            Hôm nay
          </Button>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            size="small"
            icon={<LeftOutlined />}
            onClick={handlePrevMonth}
            className="rounded-lg"
          />
          <Button
            size="small"
            icon={<RightOutlined />}
            onClick={handleNextMonth}
            className="rounded-lg"
          />
        </div>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="flex justify-center py-20 bg-white rounded-2xl border border-gray-200">
          <Spin size="large" tip="Đang tải dữ liệu lịch..." />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col">
          {/* Weekday Labels Header */}
          <div className="grid grid-cols-7 border-b border-gray-200 bg-slate-50/70 text-center text-xs font-bold text-gray-500 py-2.5">
            {weekHeader.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* 42 Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-gray-200/70">
            {calendarGrid.map((date) => {
              const dateStr = date.format('YYYY-MM-DD');
              const isCurrentMonth = date.month() === currentDate.month();
              const isToday = dateStr === todayStr;

              const dayTasks = tasksByDate.get(dateStr) || [];
              const hasOverdueUndone = dayTasks.some(
                (t) => dayjs(dateStr).isBefore(dayjs(), 'day') && t.status !== 'DONE'
              );

              const visibleTasks = dayTasks.slice(0, 3);
              const remainingCount = dayTasks.length - 3;

              return (
                <div
                  key={dateStr}
                  onClick={() => handleCellClick(date)}
                  className={`min-h-[110px] p-1.5 flex flex-col gap-1 transition-colors cursor-pointer group ${
                    !isCurrentMonth ? 'bg-slate-50/40 text-gray-300' : 'bg-white text-gray-800'
                  } ${hasOverdueUndone ? 'bg-red-50/40 border-red-200/60' : ''} hover:bg-indigo-50/30`}
                >
                  {/* Cell Top Row (Day number + indicator) */}
                  <div className="flex items-center justify-between px-1 mb-0.5">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : !isCurrentMonth
                          ? 'text-gray-300'
                          : 'text-gray-700'
                      }`}
                    >
                      {date.date()}
                    </span>

                    {hasOverdueUndone && (
                      <CustomTooltip title="Có công việc quá hạn chưa hoàn thành">
                        <ClockCircleOutlined className="text-xs text-red-500 font-bold" />
                      </CustomTooltip>
                    )}
                  </div>

                  {/* Cell Task Cards */}
                  <div className="flex flex-col gap-1 flex-1">
                    {visibleTasks.map((t) => {
                      const isDone = t.status === 'DONE';
                      const code = t.displayCode || `${t.project?.key}-${t.taskNumber}`;
                      return (
                        <div
                          key={t.id}
                          onClick={(e) => handleTaskClick(t, e)}
                          className={`p-1 px-1.5 rounded-lg border text-[11px] font-medium leading-tight truncate transition-all ${
                            isDone
                              ? 'bg-slate-100 border-slate-200 text-gray-400 line-through'
                              : 'bg-white border-gray-200/90 text-gray-800 shadow-2xs hover:border-indigo-300 hover:text-indigo-600'
                          }`}
                          title={`${code}: ${t.title}`}
                        >
                          <span className="font-mono font-bold mr-1 text-indigo-600">
                            {isDone && <CheckCircleFilled className="text-emerald-500 text-[10px] mr-1" />}
                            {code}
                          </span>
                          <span>{t.title}</span>
                        </div>
                      );
                    })}

                    {/* Popover for Remaining Tasks */}
                    {remainingCount > 0 && (
                      <Popover
                        content={
                          <div className="flex flex-col gap-1.5 min-w-[240px] max-h-64 overflow-y-auto p-1">
                            <span className="text-xs font-bold text-gray-500 pb-1 border-b border-gray-100">
                              Công việc ngày {date.format('DD/MM/YYYY')} ({dayTasks.length})
                            </span>
                            {dayTasks.map((t) => {
                              const isDone = t.status === 'DONE';
                              const code = t.displayCode || `${t.project?.key}-${t.taskNumber}`;
                              const stBadge = STATUS_BADGES[t.status];
                              return (
                                <div
                                  key={t.id}
                                  onClick={(e) => handleTaskClick(t, e)}
                                  className="flex items-center justify-between p-1.5 rounded-lg hover:bg-indigo-50 border border-transparent hover:border-indigo-100 cursor-pointer text-xs transition-all"
                                >
                                  <div className="flex items-center gap-1.5 truncate">
                                    <span className="font-mono font-bold text-indigo-600 text-[11px]">
                                      {isDone && <CheckCircleFilled className="text-emerald-500 mr-1" />}
                                      {code}
                                    </span>
                                    <span className={`truncate ${isDone ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                      {t.title}
                                    </span>
                                  </div>
                                  <Tag className={`m-0 text-[9px] border-none px-1.5 py-0.2 rounded font-semibold ${stBadge.bg} ${stBadge.text}`}>
                                    {stBadge.label}
                                  </Tag>
                                </div>
                              );
                            })}
                          </div>
                        }
                        trigger="click"
                      >
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50/70 hover:bg-indigo-100 px-1.5 py-0.5 rounded-md text-left transition-colors cursor-pointer border border-indigo-100"
                        >
                          +{remainingCount} more...
                        </button>
                      </Popover>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
