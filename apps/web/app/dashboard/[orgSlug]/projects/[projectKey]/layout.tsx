import React from 'react';

interface ProjectLayoutProps {
  children: React.ReactNode;
  modal: React.ReactNode;
}

export default function ProjectLayout({ children, modal }: ProjectLayoutProps) {
  return (
    <div className="relative w-full h-full">
      {children}
      {modal}
    </div>
  );
}
