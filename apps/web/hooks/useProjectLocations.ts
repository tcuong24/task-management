"use client";

import { useEffect, useState } from "react";
import { getSocket } from "../lib/socket";
import type { PresenceUser } from "./usePresence";
import type { ProjectSection } from "../contexts/ProjectCollaborationContext";

export type ProjectLocations = Partial<
  Record<ProjectSection, PresenceUser[]>
>;

interface ProjectLocationsPayload {
  projectId: string;
  locations: ProjectLocations;
}

export function useProjectLocations(projectId?: string) {
  const [locations, setLocations] = useState<ProjectLocations>({});

  useEffect(() => {
    if (!projectId) {
      setLocations({});
      return;
    }

    const socket = getSocket();
    const handleLocations = (payload: ProjectLocationsPayload) => {
      if (payload?.projectId === projectId) {
        setLocations(payload.locations || {});
      }
    };

    socket.on("cursor:locations", handleLocations);
    socket.emit("cursor:locations:get", { projectId });

    return () => {
      socket.off("cursor:locations", handleLocations);
      setLocations({});
    };
  }, [projectId]);

  return { locations };
}
