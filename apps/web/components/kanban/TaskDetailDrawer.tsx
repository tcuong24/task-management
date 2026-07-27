'use client';

import React from 'react';
import { Drawer } from 'antd';
import { useRouter } from 'next/navigation';
import { TaskDetailContent } from './TaskDetailContent';

interface TaskDetailDrawerProps {
  taskId: string | null;
  open?: boolean;
  onClose?: () => void;
  onTaskUpdated?: () => void;
  membersList?: { userId: string; name: string }[];
  onOpenTask?: (taskId: string) => void;
}

export function TaskDetailDrawer({
  taskId,
  open = true,
  onClose,
  onTaskUpdated,
  onOpenTask,
}: TaskDetailDrawerProps) {
  const router = useRouter();

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  };

  if (!taskId) return null;

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      width={640}
      title={null}
      closeIcon={null}
      styles={{ body: { padding: 0 } }}
      className="task-detail-drawer"
      destroyOnClose
    >
      <TaskDetailContent
        taskId={taskId}
        onClose={handleClose}
        onTaskUpdated={onTaskUpdated}
        onOpenTask={onOpenTask}
      />
    </Drawer>
  );
}
