import React from 'react';
import ProjectDashboardLoader from '../../../../../components/project/ProjectDashboardLoader';

interface PageProps {
  params: Promise<{
    orgSlug: string;
    projectKey: string;
  }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { orgSlug, projectKey } = await params;

  return (
    <ProjectDashboardLoader orgSlug={orgSlug} projectKey={projectKey} />
  );
}
