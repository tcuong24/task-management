import React from 'react';
import Link from 'next/link';
import { ActivityLogItem } from '../services/organization';

const STATUS_MAP: Record<string, string> = {
  TODO: 'Cần làm',
  IN_PROGRESS: 'Đang làm',
  IN_REVIEW: 'Đang kiểm tra',
  DONE: 'Hoàn thành',
};

const formatStatus = (val?: string | null) => {
  if (!val) return '';
  return STATUS_MAP[val] || val;
};

export function formatActivity(log: ActivityLogItem, orgSlug?: string): React.ReactNode {
  const meta = log.metadata || {};
  const projectKey = (meta.projectKey as string) || '';
  const projectName = (meta.projectName as string) || '';
  const taskTitle = (meta.taskTitle as string) || '';
  const displayCode = meta.taskNumber && projectKey ? `[${projectKey}-${meta.taskNumber}] ` : '';

  // Task Link Helper
  const renderTaskLink = (label: string) => {
    if (orgSlug && projectKey && log.entityId) {
      return (
        <Link
          href={`/dashboard/${orgSlug}/projects/${projectKey}/tasks/${log.entityId}`}
          className="font-bold text-indigo-600 hover:text-indigo-800 underline hover:no-underline transition-colors mx-0.5"
        >
          {label}
        </Link>
      );
    }
    return <span className="font-bold text-gray-900 mx-0.5">{label}</span>;
  };

  // Project Link Helper
  const renderProjectLink = (name: string) => {
    if (!name) return null;
    if (orgSlug && (projectKey || (log.entityType === 'PROJECT' && log.entityId))) {
      const pKey = projectKey || log.entityId;
      return (
        <span>
          {' trong dự án '}
          <Link
            href={`/dashboard/${orgSlug}/projects/${pKey}`}
            className="font-bold text-indigo-600 hover:text-indigo-800 underline hover:no-underline transition-colors"
          >
            "{name}"
          </Link>
        </span>
      );
    }
    return <span> trong dự án <span className="font-bold text-gray-900">"{name}"</span></span>;
  };

  const oldSt = formatStatus(log.oldValue);
  const newSt = formatStatus(log.newValue);

  switch (log.action) {
    case 'created': {
      if (log.entityType === 'PROJECT') {
        return (
          <span>
            đã tạo dự án {renderProjectLink(projectName || 'dự án mới')}
          </span>
        );
      }
      const label = taskTitle ? `"${displayCode}${taskTitle}"` : 'công việc';
      return (
        <span>
          đã tạo công việc {renderTaskLink(label)}
          {renderProjectLink(projectName)}
        </span>
      );
    }

    case 'status_changed': {
      const label = taskTitle ? `"${displayCode}${taskTitle}"` : 'công việc';
      return (
        <span>
          đã đổi trạng thái công việc {renderTaskLink(label)}
          {renderProjectLink(projectName)} từ <span className="font-semibold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded text-xs border border-gray-200">"{oldSt}"</span> sang <span className="font-semibold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded text-xs border border-gray-200">"{newSt}"</span>
        </span>
      );
    }

    case 'assignee_changed': {
      const label = taskTitle ? `"${displayCode}${taskTitle}"` : 'công việc';
      const assignee = (meta.assigneeName as string) ?? log.newValue ?? 'Chưa phân công';
      return (
        <span>
          đã gán công việc {renderTaskLink(label)}
          {renderProjectLink(projectName)} cho <span className="font-bold text-gray-900">{assignee}</span>
        </span>
      );
    }

    case 'priority_changed': {
      const label = taskTitle ? `"${displayCode}${taskTitle}"` : 'công việc';
      return (
        <span>
          đã đổi độ ưu tiên công việc {renderTaskLink(label)}
          {renderProjectLink(projectName)} sang <span className="font-bold text-gray-900">"{log.newValue}"</span>
        </span>
      );
    }

    case 'title_changed': {
      return (
        <span>
          đã đổi tên công việc từ <span className="font-bold text-gray-900">"{log.oldValue}"</span> sang {renderTaskLink(`"${log.newValue}"`)}
          {renderProjectLink(projectName)}
        </span>
      );
    }

    case 'due_date_changed': {
      const label = taskTitle ? `"${displayCode}${taskTitle}"` : 'công việc';
      return (
        <span>
          đã cập nhật hạn chót công việc {renderTaskLink(label)}
          {renderProjectLink(projectName)} thành <span className="font-bold text-gray-900">{log.newValue ?? 'Chưa đặt'}</span>
        </span>
      );
    }

    case 'member_invited':
      return <span>đã mời <span className="font-bold text-gray-900">{(meta.email as string) ?? ''}</span> tham gia tổ chức</span>;

    case 'role_changed':
      return <span>đã đổi vai trò của <span className="font-bold text-gray-900">{(meta.memberName as string) ?? 'thành viên'}</span> thành <span className="font-bold text-gray-900">{log.newValue}</span></span>;

    case 'member_removed':
      return <span>đã xóa <span className="font-bold text-gray-900">{(meta.memberName as string) ?? 'thành viên'}</span> khỏi tổ chức</span>;

    default:
      return <span>đã thực hiện một thao tác</span>;
  }
}
