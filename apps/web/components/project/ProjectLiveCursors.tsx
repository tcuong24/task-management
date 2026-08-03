"use client";

import type { LiveCursor } from "../../hooks/useLiveCursors";

interface ProjectLiveCursorsProps {
  cursors: LiveCursor[];
}

function getCursorLabel(cursor: LiveCursor) {
  return cursor.fullName || cursor.username || "Thành viên";
}

export default function ProjectLiveCursors({
  cursors,
}: ProjectLiveCursorsProps) {
  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 1100 }}
      aria-hidden="true"
    >
      {cursors.map((cursor) => (
        <div
          key={cursor.userId}
          className="
    absolute
    transition-[left,top] duration-150 ease-out
    motion-reduce:transition-none
  "
          style={{
            left: `${cursor.x * 100}%`,
            top: `${cursor.y * 100}%`,
          }}
        >
          <svg
            width="18"
            height="22"
            viewBox="0 0 18 22"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M1 1L16 11L9.5 12.5L6 20L1 1Z"
              className="fill-gray-900 stroke-white"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>

          <span className="ml-3 inline-flex max-w-40 truncate rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white shadow-md">
            {getCursorLabel(cursor)}
          </span>
        </div>
      ))}
    </div>
  );
}
