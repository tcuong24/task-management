import React from 'react';
import ProjectCursorScope from '../../../../../components/project/ProjectCursorScope';
import { ProjectCollaborationProvider } from '../../../../../contexts/ProjectCollaborationContext';

interface ProjectLayoutProps {
  children: React.ReactNode;
  modal: React.ReactNode;
}

export default function ProjectLayout({ children, modal }: ProjectLayoutProps) {
  return (
    <ProjectCollaborationProvider>
      <div className="relative w-full h-full">
        <ProjectCursorScope />
        {children}
        {modal}
      </div>
    </ProjectCollaborationProvider>
  );
}
