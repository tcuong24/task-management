'use client';

import { useEffect } from 'react';
import { getSocket } from '../lib/socket';

interface RealtimeSyncOptions {
  projectId?: string;
  taskId?: string;
  onTaskCreated?: (task: any) => void;
  onTaskUpdated?: (data: { taskId: string; projectId: string; changedFields: any }) => void;
  onCommentAdded?: (data: { taskId: string; projectId: string; comment: any }) => void;
  onRefresh?: () => void;
}

export function useTaskRealtimeSync({
  projectId,
  taskId,
  onTaskCreated,
  onTaskUpdated,
  onCommentAdded,
  onRefresh,
}: RealtimeSyncOptions) {
  useEffect(() => {
    if (!projectId && !taskId) return;

    const socket = getSocket();

    const handleCreated = (data: { task: any; projectId: string }) => {
      if (projectId && data.projectId === projectId) {
        if (onTaskCreated) onTaskCreated(data.task);
        if (onRefresh) onRefresh();
      }
    };

    const handleUpdated = (data: { taskId: string; projectId: string; changedFields: any }) => {
      if (
        (projectId && data.projectId === projectId) ||
        (taskId && data.taskId === taskId)
      ) {
        if (onTaskUpdated) onTaskUpdated(data);
        if (onRefresh) onRefresh();
      }
    };

    const handleCommentAdded = (data: { taskId: string; projectId: string; comment: any }) => {
      if (
        (taskId && data.taskId === taskId) ||
        (projectId && data.projectId === projectId)
      ) {
        if (onCommentAdded) onCommentAdded(data);
        if (onRefresh) onRefresh();
      }
    };

    socket.on('task:created', handleCreated);
    socket.on('task:updated', handleUpdated);
    socket.on('task:comment_added', handleCommentAdded);

    return () => {
      socket.off('task:created', handleCreated);
      socket.off('task:updated', handleUpdated);
      socket.off('task:comment_added', handleCommentAdded);
    };
  }, [projectId, taskId, onTaskCreated, onTaskUpdated, onCommentAdded, onRefresh]);
}
