import React from 'react';
import { cookies } from 'next/headers';
import ProjectDashboard from '../../../../../components/project/ProjectDashboard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface PageProps {
  params: Promise<{
    orgSlug: string;
    projectKey: string;
  }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { orgSlug, projectKey } = await params;
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  // 1. Resolve Organization by orgSlug or id
  let orgId = orgSlug;
  try {
    const orgRes = await fetch(`${API_URL}/organizations/by-slug/${encodeURIComponent(orgSlug)}`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    });
    if (orgRes.ok) {
      const orgData = await orgRes.json();
      if (orgData.success && orgData.organization) {
        orgId = orgData.organization.id;
      }
    }
  } catch (err) {
    console.error('Error fetching org by slug:', err);
  }

  // 2. Resolve Project by projectKey within Organization
  let projectId = projectKey;
  let projectObj = null;
  try {
    const projRes = await fetch(`${API_URL}/organizations/${orgId}/projects/by-key/${encodeURIComponent(projectKey)}`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    });
    if (projRes.ok) {
      const projData = await projRes.json();
      if (projData.success && projData.project) {
        projectId = projData.project.id;
        projectObj = projData.project;
      }
    }
  } catch (err) {
    console.error('Error fetching project by key:', err);
  }

  let initialDashboardData = null;
  try {
    const dashRes = await fetch(`${API_URL}/organizations/${orgId}/projects/${projectId}/dashboard`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    });
    if (dashRes.ok) {
      const dashData = await dashRes.json();
      if (dashData.success) {
        initialDashboardData = dashData.dashboard;
      }
    }
  } catch (err) {
    console.error('Error fetching dashboard data:', err);
  }

  return (
    <ProjectDashboard
      orgId={orgId}
      projectId={projectId}
      project={projectObj}
      initialDashboardData={initialDashboardData}
    />
  );
}
