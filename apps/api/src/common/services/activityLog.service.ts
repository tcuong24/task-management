import { prisma, ActivityEntityType } from '@repo/database';

export interface LogActivityParams {
  organizationId: string;
  entityType: ActivityEntityType;
  entityId: string;
  actorId: string;
  action: string;
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: Record<string, unknown>;
}

export async function logActivity(params: LogActivityParams) {
  try {
    return await prisma.activityLog.create({
      data: {
        organizationId: params.organizationId,
        entityType: params.entityType,
        entityId: params.entityId,
        actorId: params.actorId,
        action: params.action,
        oldValue: params.oldValue ?? null,
        newValue: params.newValue ?? null,
        metadata: (params.metadata as any) ?? undefined,
      },
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}
