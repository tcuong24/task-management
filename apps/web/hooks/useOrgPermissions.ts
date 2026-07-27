import { useAuth } from './useAuth';
import { OrgRole, hasPermission } from '@repo/permissions';

export function useOrgPermissions() {
  const { user } = useAuth();
  const role = (user?.role || 'MEMBER') as OrgRole;

  return {
    role,
    canViewSettings: hasPermission(role, 'view:org-settings'),
    canViewMembers: hasPermission(role, 'view:members'),
    canInvite: hasPermission(role, 'member:invite'),
    canChangeRole: hasPermission(role, 'member:change-role'),
    canRemoveMember: hasPermission(role, 'member:remove'),
  };
}
