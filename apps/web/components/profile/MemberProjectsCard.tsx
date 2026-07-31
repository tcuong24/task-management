"use client";

import React from "react";
import Link from "next/link";
import { FolderOutlined } from "@ant-design/icons";

interface ProjectItem {
  id: string;
  name: string;
  key: string;
  taskCount: number;
}

interface MemberProjectsCardProps {
  projects: ProjectItem[];
  orgSlug: string;
}

export function MemberProjectsCard({
  projects,
  orgSlug,
}: MemberProjectsCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">
          Dự án tham gia ({projects.length})
        </h2>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-8 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
          <FolderOutlined className="text-3xl text-gray-400 mb-2" />
          <p className="text-sm font-medium text-gray-600">
            Chưa có dự án nào
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Thành viên này chưa được giao task trong dự án nào của tổ chức.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/${orgSlug}/projects/${project.key}`}
              className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors duration-150 ease-out group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-xs flex-shrink-0 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors duration-150 ease-out">
                  {project.key}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors duration-150 ease-out">
                    {project.name}
                  </p>
                  <p className="text-xs text-gray-500 font-mono">
                    PROJ-{project.key}
                  </p>
                </div>
              </div>

              <div className="text-right flex-shrink-0 ml-4">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                  {project.taskCount} task
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
