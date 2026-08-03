"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useOrg } from "../../contexts/OrgContext";
import { useProjectCollaboration } from "../../contexts/ProjectCollaborationContext";
import { useLiveCursors } from "../../hooks/useLiveCursors";
import * as projectService from "../../services/project";
import ProjectLiveCursors from "./ProjectLiveCursors";

export default function ProjectCursorScope() {
  const params = useParams();
  const projectKey = (params?.projectKey as string | undefined) || "";
  const { currentOrg } = useOrg();
  const { section } = useProjectCollaboration();
  const [projectId, setProjectId] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    setProjectId(undefined);

    if (!currentOrg?.id || !projectKey) return;

    projectService
      .getProjectByKey(currentOrg.id, projectKey)
      .then((response) => {
        if (!cancelled && response.success && response.project?.id) {
          setProjectId(response.project.id);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Failed to initialize project live cursors:", error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentOrg?.id, projectKey]);

  const cursorRoom = projectId
    ? `project:${projectId}:cursor:${section}`
    : undefined;
  const { cursors, sendCursorPosition, removeCursor } =
    useLiveCursors(cursorRoom);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      if (window.innerWidth <= 0 || window.innerHeight <= 0) return;

      sendCursorPosition(
        event.clientX / window.innerWidth,
        event.clientY / window.innerHeight,
      );
    };

    const handlePointerOut = (event: PointerEvent) => {
      if (!event.relatedTarget) removeCursor();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) removeCursor();
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerout", handlePointerOut);
    window.addEventListener("blur", removeCursor);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerout", handlePointerOut);
      window.removeEventListener("blur", removeCursor);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [removeCursor, sendCursorPosition]);

  return <ProjectLiveCursors cursors={cursors} />;
}
