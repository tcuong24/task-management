'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { TaskDetailDrawer } from '../../../../../../../../components/kanban/TaskDetailDrawer';

export default function InterceptedTaskPage() {
  const params = useParams();
  const taskId = (params?.taskId as string) || '';
  return <TaskDetailDrawer taskId={taskId} />;
}
