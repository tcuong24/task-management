"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

export type ProjectSection =
  | "summary"
  | "board"
  | "list"
  | "timeline"
  | "task";

interface ProjectCollaborationContextValue {
  section: ProjectSection;
  setSection: (section: ProjectSection) => void;
}

const ProjectCollaborationContext =
  createContext<ProjectCollaborationContextValue | null>(null);

export function ProjectCollaborationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [section, setSection] = useState<ProjectSection>(() =>
    pathname.includes("/tasks/") ? "task" : "summary",
  );

  useEffect(() => {
    if (pathname.includes("/tasks/")) {
      setSection("task");
    }
  }, [pathname]);

  const value = useMemo(() => ({ section, setSection }), [section]);

  return (
    <ProjectCollaborationContext.Provider value={value}>
      {children}
    </ProjectCollaborationContext.Provider>
  );
}

export function useProjectCollaboration() {
  const context = useContext(ProjectCollaborationContext);

  if (!context) {
    throw new Error(
      "useProjectCollaboration must be used inside ProjectCollaborationProvider",
    );
  }

  return context;
}
