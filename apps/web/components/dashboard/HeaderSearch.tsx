"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { AutoComplete, Avatar, Spin, Tag } from "antd";
import { SearchOutlined, UserOutlined, FolderOutlined, CheckSquareOutlined, CalendarOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useOrg } from "../../contexts/OrgContext";
import {
  searchGlobal,
  GlobalSearchResult,
  SearchTaskItem,
  SearchProjectItem,
  SearchMemberItem,
} from "../../services/search";

function getPriorityBadge(priority: string) {
  switch (priority.toUpperCase()) {
    case "URGENT":
      return <Tag color="red" className="m-0 rounded-md font-semibold text-[10px] uppercase">Khẩn cấp</Tag>;
    case "HIGH":
      return <Tag color="volcano" className="m-0 rounded-md font-semibold text-[10px] uppercase">Cao</Tag>;
    case "MEDIUM":
      return <Tag color="gold" className="m-0 rounded-md font-semibold text-[10px] uppercase">Trung bình</Tag>;
    case "LOW":
      return <Tag color="default" className="m-0 rounded-md font-semibold text-[10px] uppercase">Thấp</Tag>;
    default:
      return null;
  }
}

function getStatusBadge(status: string) {
  switch (status.toUpperCase()) {
    case "DONE":
    case "COMPLETED":
      return <Tag color="green" className="m-0 rounded-md font-semibold text-[10px] uppercase">Hoàn thành</Tag>;
    case "IN_PROGRESS":
    case "DOING":
      return <Tag color="processing" className="m-0 rounded-md font-semibold text-[10px] uppercase">Đang làm</Tag>;
    case "TODO":
    default:
      return <Tag color="default" className="m-0 rounded-md font-semibold text-[10px] uppercase">Cần làm</Tag>;
  }
}

function getRoleBadge(role: string) {
  switch (role.toUpperCase()) {
    case "OWNER":
      return <Tag color="purple" className="m-0 rounded-md font-semibold text-[10px] uppercase">Chủ sở hữu</Tag>;
    case "ADMIN":
      return <Tag color="blue" className="m-0 rounded-md font-semibold text-[10px] uppercase">Quản trị viên</Tag>;
    case "GUEST":
      return <Tag color="default" className="m-0 rounded-md font-semibold text-[10px] uppercase">Khách</Tag>;
    case "MEMBER":
    default:
      return <Tag color="default" className="m-0 rounded-md font-semibold text-[10px] uppercase">Thành viên</Tag>;
  }
}

export default function HeaderSearch() {
  const router = useRouter();
  const { currentOrg } = useOrg();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GlobalSearchResult | null>(null);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<any>(null);
  const isMac = typeof window !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  // Ctrl+K / Cmd+K Keyboard Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Debounced search with AbortController
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2 || !currentOrg?.id) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const timer = setTimeout(async () => {
      // Abort any previous pending fetch
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const res = await searchGlobal(currentOrg.id, trimmed, controller.signal, 5);

        if (res.success) {
          setResults(res);
          setOpen(true);
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Global search error:", err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [query, currentOrg?.id]);

  const handleSelect = (_value: string, option: any) => {
    if (!option || !currentOrg) return;
    const { itemType, payload } = option;
    const orgSlug = currentOrg.slug || currentOrg.id;

    setOpen(false);
    setQuery("");

    startTransition(() => {
      if (itemType === "task") {
        const task = payload as SearchTaskItem;
        router.push(`/dashboard/${orgSlug}/projects/${task.project.key}?taskId=${task.id}`);
      } else if (itemType === "project") {
        const project = payload as SearchProjectItem;
        router.push(`/dashboard/${orgSlug}/projects/${project.key}`);
      } else if (itemType === "member") {
        router.push(`/dashboard/${orgSlug}/members`);
      }
    });
  };

  // Build options grouped by category
  const renderTitle = (title: string, icon: React.ReactNode, count: number) => (
    <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wide py-1 border-b border-gray-100">
      <span className="flex items-center gap-1.5">
        {icon}
        {title}
      </span>
      <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded-full font-medium">
        {count}
      </span>
    </div>
  );

  const options: any[] = [];
  if (results) {
    const { tasks, projects, members } = results.results;

    if (tasks.length > 0) {
      options.push({
        label: renderTitle("Công việc", <CheckSquareOutlined className="text-blue-500" />, results.counts.tasks),
        options: tasks.map((task) => ({
          value: `task-${task.id}`,
          itemType: "task",
          payload: task,
          label: (
            <div className="flex flex-col gap-1 py-1 px-0.5 hover:bg-gray-50 rounded-lg transition-colors duration-150">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 overflow-hidden min-w-0">
                  <span className="font-mono text-[11px] font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 flex-shrink-0">
                    {task.displayCode}
                  </span>
                  <span className="text-xs font-semibold text-gray-900 truncate">
                    {task.title}
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {getStatusBadge(task.status)}
                  {getPriorityBadge(task.priority)}
                </div>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-gray-500 pl-0.5">
                <span className="flex items-center gap-1 truncate max-w-[150px]">
                  <FolderOutlined className="text-amber-500 text-[10px]" />
                  <span className="truncate font-medium">{task.project.name}</span>
                </span>
                {task.assignee && (
                  <span className="flex items-center gap-1 truncate max-w-[130px]">
                    <UserOutlined className="text-blue-500 text-[10px]" />
                    <span className="truncate">{task.assignee.fullName}</span>
                  </span>
                )}
                {task.dueDate && (
                  <span className="flex items-center gap-1 text-gray-400 flex-shrink-0">
                    <CalendarOutlined className="text-[10px]" />
                    <span>{new Date(task.dueDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}</span>
                  </span>
                )}
              </div>
            </div>
          ),
        })),
      });
    }

    if (projects.length > 0) {
      options.push({
        label: renderTitle("Dự án", <FolderOutlined className="text-amber-500" />, results.counts.projects),
        options: projects.map((project) => ({
          value: `project-${project.id}`,
          itemType: "project",
          payload: project,
          label: (
            <div className="flex items-center justify-between gap-2 py-1.5 hover:bg-gray-50 rounded-lg transition-colors duration-150">
              <div className="flex items-center gap-2 overflow-hidden min-w-0">
                <span className="font-mono text-[11px] font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 flex-shrink-0">
                  {project.key}
                </span>
                <span className="text-xs font-semibold text-gray-900 truncate">
                  {project.name}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-gray-500 flex-shrink-0">
                <UserOutlined className="text-gray-400 text-[10px]" />
                <span className="font-medium truncate max-w-[120px]">{project.owner.fullName}</span>
              </div>
            </div>
          ),
        })),
      });
    }

    if (members.length > 0) {
      options.push({
        label: renderTitle("Thành viên", <UserOutlined className="text-emerald-500" />, results.counts.members),
        options: members.map((member) => ({
          value: `member-${member.id}`,
          itemType: "member",
          payload: member,
          label: (
            <div className="flex items-center justify-between gap-2 py-1.5 hover:bg-gray-50 rounded-lg transition-colors duration-150">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar
                  src={member.avatarUrl}
                  icon={!member.avatarUrl ? <UserOutlined /> : undefined}
                  size="small"
                  className="bg-gray-200 text-gray-700 flex-shrink-0"
                >
                  {member.fullName.charAt(0).toUpperCase()}
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-gray-900 truncate">
                    {member.fullName}
                  </span>
                  <span className="text-[10px] text-gray-400 truncate">
                    @{member.username} {member.email ? `• ${member.email}` : ""}
                  </span>
                </div>
              </div>
              {getRoleBadge(member.role)}
            </div>
          ),
        })),
      });
    }
  }

  const isNotFound = query.trim().length >= 2 && !loading && results && options.length === 0;

  return (
    <div className="relative w-40 sm:w-56 md:w-72">
      <AutoComplete
        ref={inputRef}
        value={query}
        options={options}
        open={open && options.length > 0}
        onSearch={(val) => setQuery(val)}
        onSelect={handleSelect}
        onDropdownVisibleChange={(vis) => setOpen(vis)}
        notFoundContent={
          isNotFound ? (
            <div className="p-3 text-center text-xs text-gray-400 font-medium">
              Không tìm thấy kết quả phù hợp
            </div>
          ) : undefined
        }
        className="w-full"
        popupMatchSelectWidth={440}
        popupClassName="rounded-xl shadow-xl border border-gray-100 bg-white p-1"
      >
        <div className="relative flex items-center w-full">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (options.length > 0) setOpen(true);
            }}
            placeholder="Tìm kiếm công việc..."
            className="w-full h-9 pl-9 pr-12 text-xs rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150 text-gray-900 placeholder-gray-400"
          />
          <div className="absolute left-3 flex items-center pointer-events-none text-gray-400">
            {loading ? <Spin size="small" /> : <SearchOutlined className="text-sm" />}
          </div>
          <div className="absolute right-2.5 flex items-center pointer-events-none">
            <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-semibold text-gray-400 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5">
              {isMac ? "⌘K" : "Ctrl K"}
            </kbd>
          </div>
        </div>
      </AutoComplete>
    </div>
  );
}
