"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Spin } from "antd";
import { WarningOutlined } from "@ant-design/icons";
import { useOrg } from "../../contexts/OrgContext";
import * as projectService from "../../services/project";
import ProjectDashboard from "./ProjectDashboard";

interface ProjectDashboardLoaderProps {
  orgSlug: string;
  projectKey: string;
}

export default function ProjectDashboardLoader({
  orgSlug,
  projectKey,
}: ProjectDashboardLoaderProps) {
  const { currentOrg, loading: orgLoading } = useOrg();
  const [project, setProject] = useState<projectService.ProjectInfo | null>(
    null,
  );
  const [dashboard, setDashboard] =
    useState<projectService.ProjectDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const loadProject = useCallback(async () => {
    if (!currentOrg?.id || currentOrg.slug !== orgSlug) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const projectResponse = await projectService.getProjectByKey(
        currentOrg.id,
        projectKey,
      );
      const dashboardResponse = await projectService.getProjectDashboard(
        currentOrg.id,
        projectResponse.project.id,
      );

      setProject(projectResponse.project);
      setDashboard(dashboardResponse.dashboard);
    } catch (loadError: any) {
      console.error("Error loading project:", loadError);
      setError(loadError.message || "Không thể tải dữ liệu dự án.");
    } finally {
      setLoading(false);
    }
  }, [currentOrg?.id, currentOrg?.slug, orgSlug, projectKey]);

  useEffect(() => {
    if (!orgLoading) {
      void loadProject();
    }
  }, [orgLoading, loadProject, retryKey]);

  if (orgLoading || loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!currentOrg || currentOrg.slug !== orgSlug || !project || !dashboard) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-4 p-6 text-center">
        <WarningOutlined className="text-3xl text-amber-500" />
        <div className="max-w-md">
          <h2 className="m-0 text-lg font-semibold text-gray-900">
            Không thể tải dự án
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            {error || "Dự án không thuộc tổ chức hiện tại hoặc không còn tồn tại."}
          </p>
        </div>
        <Button onClick={() => setRetryKey((value) => value + 1)}>
          Thử lại
        </Button>
      </div>
    );
  }

  return (
    <ProjectDashboard
      orgId={currentOrg.id}
      projectId={project.id}
      project={project}
      initialDashboardData={dashboard}
    />
  );
}
