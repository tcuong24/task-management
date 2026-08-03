export type OrgRole = "OWNER" | "ADMIN" | "MEMBER" | "GUEST";

export type PermissionAction =
  // Sidebar / Menu navigation
  | "view:personal-dashboard"
  | "view:org-activities"
  | "view:project-list:all"
  | "view:project-list:participated"
  | "view:members"
  | "view:org-settings"
  | "view:billing-delete-org"

  // Project actions
  | "project:create"
  | "project:archive"
  | "project:delete" // Hard delete, owner only
  | "project:transfer-ownership"

  // Task actions
  | "task:create"
  | "task:edit:own"
  | "task:edit:all"
  | "task:delete:own"
  | "task:delete:all"

  // Organization members management
  | "member:invite"
  | "member:change-role" // MEMBER <-> ADMIN
  | "member:remove" // Remove MEMBER
  | "member:remove-admin" // Remove ADMIN (owner only)
  | "org:transfer-ownership" // Transfer organization ownership

  // Label and configuration
  | "label:manage" // Create, edit, delete labels
  | "label:attach" // Attach label to task

  // Trash actions
  | "trash:view"
  | "trash:restore"
  | "trash:purge"; // Hard delete from trash (owner only)

const permissionMatrix: Record<OrgRole, Set<PermissionAction>> = {
  OWNER: new Set<PermissionAction>([
    "view:personal-dashboard",
    "view:project-list:all",
    "view:project-list:participated",
    "view:members",
    "view:org-settings",
    "view:billing-delete-org",
    'view:org-activities',

    "project:create",
    "project:archive",
    "project:delete",
    "project:transfer-ownership",

    "task:create",
    "task:edit:own",
    "task:edit:all",
    "task:delete:own",
    "task:delete:all",

    "member:invite",
    "member:change-role",
    "member:remove",
    "member:remove-admin",

    "org:transfer-ownership",

    "label:manage",
    "label:attach",

    "trash:view",
    "trash:restore",
    "trash:purge",
  ]),
  ADMIN: new Set<PermissionAction>([
    "view:personal-dashboard",
    "view:project-list:all",
    "view:project-list:participated",
    "view:members",
    "view:org-settings",
    'view:org-activities',
    // 'view:billing-delete-org' is hidden for ADMIN
    "project:create",
    "project:archive",
    // 'project:delete' is hidden for ADMIN
    "task:create",
    "task:edit:own",
    "task:edit:all",
    "task:delete:own",
    "task:delete:all",
    "member:invite",
    "member:change-role",
    "member:remove",
    // 'member:remove-admin' is hidden for ADMIN
    "label:manage",
    "label:attach",

    "trash:view",
    "trash:restore",
    // 'trash:purge' is hidden for ADMIN
  ]),
  MEMBER: new Set<PermissionAction>([
    "view:personal-dashboard",
    "view:project-list:participated",
    'view:org-activities',
    // 'view:members' is hidden
    // 'view:org-settings' is hidden
    "task:create",
    "task:edit:own",
    "task:delete:own",
    "label:attach",
  ]),
  GUEST: new Set<PermissionAction>(["view:personal-dashboard"]),
};

/**
 * Checks whether a role has permission to perform an action.
 */
export function hasPermission(
  role: OrgRole,
  action: PermissionAction,
): boolean {
  return permissionMatrix[role]?.has(action) ?? false;
}
