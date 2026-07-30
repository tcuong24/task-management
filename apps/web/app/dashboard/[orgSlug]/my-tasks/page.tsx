"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Select, Spin, App } from "antd";
import { FilterOutlined } from "@ant-design/icons";
import { useOrg } from "../../../../contexts/OrgContext";
import * as orgService from "../../../../services/organization";
import * as projectService from "../../../../services/project";
import * as taskService from "../../../../services/task";
import {
  KanbanBoard,
  TaskItem,
} from "../../../../components/kanban/KanbanBoard";

export default function MyTasksPage() {
  const params = useParams();
  const orgSlug = (params?.orgSlug || params?.id) as string;

  const { message } = App.useApp();
  const { currentOrg, loading: orgLoading } = useOrg();
  const orgId = currentOrg?.id;

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [projectsList, setProjectsList] = useState<
    { id: string; key: string; name: string }[]
  >([]);

  // Filter States
  const [selectedProjectId, setSelectedProjectId] = useState<
    string | undefined
  >(undefined);
  const [selectedPriority, setSelectedPriority] = useState<string | undefined>(
    undefined,
  );

  const fetchMyTasks = useCallback(
    async (signal?: AbortSignal) => {
      if (!orgId) {
        setTasks([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const response = await orgService.getMyTasksInOrg(
          orgId,
          {
            projectId: selectedProjectId,
            priority: selectedPriority,
          },
          signal,
        );

        if (response.success) {
          setTasks(response.tasks);
        }
      } catch (error: any) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("Không thể tải task của tôi:", error);
        message.error(error.message || "Không thể tải danh sách công việc.");
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [orgId, selectedProjectId, selectedPriority, message],
  );
  const fetchProjects = useCallback(
    async (signal?: AbortSignal) => {
      if (!orgId) {
        setProjectsList([]);
        return;
      }

      try {
        const response = await projectService.getProjects(orgId, signal);

        if (response.success) {
          setProjectsList(
            response.projects.map((project) => ({
              id: project.id,
              key: project.key,
              name: project.name,
            })),
          );
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("Không thể tải project:", error);
      }
    },
    [orgId],
  );

  useEffect(() => {
    const controller = new AbortController();

    fetchMyTasks(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchMyTasks]);
  useEffect(() => {
    const controller = new AbortController();

    fetchProjects(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchProjects]);
  const handleStatusChange = async (
    task: TaskItem,
    newStatus: TaskItem["status"],
  ) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)),
    );

    try {
      if (!orgId) return;
      await taskService.moveTask(orgId, task.projectId, task.id, newStatus, 0);
      message.success("Cập nhật trạng thái công việc thành công!");
    } catch (err: any) {
      message.error(err.message || "Không thể cập nhật trạng thái.");
      fetchMyTasks();
    }
  };

  const handleTaskSave = async (data: any) => {
    if (!orgId) return;
    if (data.id) {
      await taskService.updateTask(orgId, data.projectId, data.id, data);
      message.success("Cập nhật công việc thành công!");
    } else {
      await taskService.createTask(orgId, data.projectId, data);
      message.success("Tạo công việc thành công!");
    }
    fetchMyTasks();
  };

  const handleTaskDelete = async (task: TaskItem) => {
    if (!orgId) return;
    await taskService.deleteTask(orgId, task.projectId, task.id);
    message.success("Đã xóa công việc.");
    fetchMyTasks();
  };

  if (orgLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Spin size="large" />
        <span className="text-sm font-medium text-gray-500">Đang tải...</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6 mx-auto w-full text-left max-w-full">
      {/* Header & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
            Task của tôi
          </h1>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mr-1">
            <FilterOutlined />
            <span>Lọc:</span>
          </div>

          <Select
            placeholder="Tất cả dự án"
            allowClear
            value={selectedProjectId}
            onChange={(val) => setSelectedProjectId(val)}
            className="w-[180px]"
          >
            {projectsList.map((p) => (
              <Select.Option key={p.id} value={p.id}>
                [{p.key}] {p.name}
              </Select.Option>
            ))}
          </Select>

          <Select
            placeholder="Độ ưu tiên"
            allowClear
            value={selectedPriority}
            onChange={(val) => setSelectedPriority(val)}
            className="w-[140px]"
          >
            <Select.Option value="LOW">Thấp</Select.Option>
            <Select.Option value="MEDIUM">Trung bình</Select.Option>
            <Select.Option value="HIGH">Cao</Select.Option>
            <Select.Option value="CRITICAL">Khẩn cấp</Select.Option>
          </Select>
        </div>
      </div>

      {/* Main Kanban Board */}
      <KanbanBoard
        tasks={tasks}
        loading={loading}
        showProjectBadge={true}
        requireProjectSelect={true}
        projectsList={projectsList}
        onStatusChange={handleStatusChange}
        onTaskSave={handleTaskSave}
        onTaskDelete={handleTaskDelete}
      />
    </div>
  );
}
