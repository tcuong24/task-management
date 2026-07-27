'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FolderOutlined,
  ProjectOutlined,
  DownOutlined,
  RightOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import CustomTooltip from '../common/CustomTooltip';
import { useOrg } from '../../contexts/OrgContext';
import { getProjects, ProjectInfo } from '../../services/project';

interface RecentProjectsProps {
  collapsed: boolean;
}

export function RecentProjects({ collapsed }: RecentProjectsProps) {
  const { currentOrg } = useOrg();
  const pathname = usePathname();
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentOrg) {
      setProjects([]);
      return;
    }

    let isMounted = true;
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const res = await getProjects(currentOrg.id);
        if (res.success && isMounted) {
          // Take top 3 projects
          setProjects(res.projects.slice(0, 3));
        }
      } catch (err) {
        // Silently skip if role lacks permission
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProjects();

    return () => {
      isMounted = false;
    };
  }, [currentOrg]);

  if (!currentOrg) return null;

  const orgSlug = currentOrg.slug || currentOrg.id;
  const orgProjectsUrl = `/dashboard/${orgSlug}/projects`;

  if (collapsed) {
    return (
      <CustomTooltip title="Projects" placement="right">
        <Link
          href={orgProjectsUrl}
          className={`flex items-center justify-center p-2.5 rounded-xl !text-gray-500 hover:!text-indigo-600 hover:!bg-gray-100 transition-all mx-1 ${
            pathname.startsWith(orgProjectsUrl) ? '!bg-indigo-50 !text-indigo-600 font-bold' : ''
          }`}
        >
          <ProjectOutlined className="text-lg" />
        </Link>
      </CustomTooltip>
    );
  }

  return (
    <div className="flex flex-col gap-1 text-left">
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider !text-gray-400 hover:!text-gray-600 cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          <ProjectOutlined className="text-sm" />
          <span>Projects</span>
        </div>
        {expanded ? <DownOutlined className="text-[10px]" /> : <RightOutlined className="text-[10px]" />}
      </div>

      {/* Expandable Project List */}
      {expanded && (
        <div className="flex flex-col gap-0.5 ml-2 border-l border-gray-100 pl-2">
          {projects.map((p) => {
            const projectBoardUrl = `/dashboard/${orgSlug}/projects/${p.key}`;
            const isActive = pathname.startsWith(projectBoardUrl);

            return (
              <Link
                key={p.id}
                href={projectBoardUrl}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? '!bg-indigo-50 !text-indigo-700 font-bold'
                    : '!text-gray-600 hover:!text-indigo-600 hover:!bg-gray-50'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                <span className="truncate flex-1">[{p.key}] {p.name}</span>
              </Link>
            );
          })}

          {/* View All Projects link */}
          <Link
            href={orgProjectsUrl}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/50 mt-0.5 transition-all"
          >
            <UnorderedListOutlined className="text-[11px]" />
            <span>Xem tất cả</span>
          </Link>
        </div>
      )}
    </div>
  );
}
