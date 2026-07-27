'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { TaskDetailContent } from '../../../../../../../components/kanban/TaskDetailContent';

export default function TaskDetailPage() {
  const params = useParams();
  const orgSlug = (params?.orgSlug as string) || '';
  const projectKey = (params?.projectKey as string) || '';
  const taskId = (params?.taskId as string) || '';

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-4">
        {/* Back Button */}
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/${orgSlug}/projects/${projectKey}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-indigo-600 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm transition-colors"
          >
            <ArrowLeftOutlined /> Quay lại Board dự án
          </Link>
        </div>

        {/* Standalone Task Detail Card */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-md overflow-hidden min-h-[600px]">
          <TaskDetailContent
            taskId={taskId}
            isStandalone={true}
          />
        </div>
      </div>
    </div>
  );
}
