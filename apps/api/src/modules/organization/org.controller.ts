import { Request, Response, NextFunction } from 'express';
import * as orgService from './org.service';
import { OrgRole } from '@repo/permissions';
import { ValidationError } from '../../common/errors';
import { prisma } from '@repo/database';

export async function getOrganizationHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    if (!id) {
      throw new ValidationError('Mã tổ chức không được để trống.');
    }
    const org = await orgService.getOrganization(id);
    res.status(200).json({ success: true, organization: org });
  } catch (err) {
    next(err);
  }
}

export async function getOrganizationBySlugHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { slug } = req.params as { slug: string };
    if (!slug) {
      throw new ValidationError('Slug tổ chức không được để trống.');
    }
    const org = await orgService.getOrganizationBySlug(slug);
    res.status(200).json({ success: true, organization: org });
  } catch (err) {
    next(err);
  }
}

export async function updateOrganizationHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    const { name, slug } = req.body;
    if (!id) {
      throw new ValidationError('Mã tổ chức không được để trống.');
    }
    if (!name && !slug) {
      throw new ValidationError('Cần cung cấp ít nhất tên hoặc slug để cập nhật.');
    }
    const updated = await orgService.updateOrganization(id, name, slug);
    res.status(200).json({ success: true, organization: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteOrganizationHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    if (!id) {
      throw new ValidationError('Mã tổ chức không được để trống.');
    }

    await orgService.deleteOrganization(id);
    res.status(200).json({ success: true, message: 'Đã xóa tổ chức.' });
  } catch (err) {
    next(err);
  }
}

export async function getMembersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    if (!id) {
      throw new ValidationError('Mã tổ chức không được để trống.');
    }
    const data = await orgService.getMembers(id);
    res.status(200).json({ success: true, members: data.members, invitations: data.invitations });
  } catch (err) {
    next(err);
  }
}

export async function inviteMemberHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    const { email, role } = req.body;
    const invitedById = req.user?.userId;

    if (!id) {
      throw new ValidationError('Mã tổ chức không được để trống.');
    }
    if (!email || !role) {
      throw new ValidationError('Vui lòng điền đầy đủ email và vai trò cần mời.');
    }
    if (!invitedById) {
      throw new ValidationError('Yêu cầu xác thực tài khoản mời.');
    }

    const invitation = await orgService.inviteMember(id, email, role as OrgRole, invitedById);
    res.status(201).json({ success: true, invitation });
  } catch (err) {
    next(err);
  }
}

export async function updateMemberRoleHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, memberId } = req.params as { id: string; memberId: string };
    const { role } = req.body;
    const currentUserId = req.user?.userId;

    if (!id || !memberId) {
      throw new ValidationError('Thiếu mã tổ chức hoặc mã thành viên.');
    }
    if (!role) {
      throw new ValidationError('Vui lòng cung cấp vai trò mới.');
    }

    const member = await prisma.organizationMember.findUnique({ where: { id: memberId } });
    if (member && currentUserId && (member.userId === currentUserId || member.id === currentUserId)) {
      res.status(403).json({
        success: false,
        message: 'Bạn không thể tự thay đổi vai trò của chính mình.',
      });
      return;
    }

    const updated = await orgService.updateMemberRole(id, memberId, role as OrgRole, req.user?.userId);
    res.status(200).json({ success: true, member: updated });
  } catch (err) {
    next(err);
  }
}

export async function removeMemberHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, memberId } = req.params as { id: string; memberId: string };

    if (!id || !memberId) {
      throw new ValidationError('Thiếu mã tổ chức hoặc mã thành viên.');
    }

    await orgService.removeMember(id, memberId, req.user?.userId);
    res.status(200).json({ success: true, message: 'Đã tạm khóa thành viên khỏi tổ chức.' });
  } catch (err) {
    next(err);
  }
}

export async function getUserOrganizationsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new ValidationError('Yêu cầu đăng nhập để thực hiện hành động này.');
    }

    const organizations = await orgService.getUserOrganizations(userId);

    res.status(200).json({ success: true, organizations });
  } catch (err) {
    next(err);
  }
}

export async function createOrganizationHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { name, slug, avatarUrl } = req.body;

    if (!userId) {
      throw new ValidationError('Yêu cầu đăng nhập để thực hiện hành động này.');
    }
    if (!name || !slug) {
      throw new ValidationError('Vui lòng cung cấp đầy đủ tên và slug của tổ chức.');
    }

    const organization = await orgService.createOrganization(
      userId,
      name,
      slug,
      avatarUrl
    );
    res.status(201).json({ success: true, organization });
  } catch (err) {
    next(err);
  }
}

export async function getOrganizationStatsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    if (!id) {
      throw new ValidationError('Mã tổ chức không được để trống.');
    }

    const stats = await orgService.getOrganizationStats(id);
    res.status(200).json({ success: true, stats });
  } catch (err) {
    next(err);
  }
}

export async function getInvitationHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = req.params as { token: string };
    if (!token) {
      throw new ValidationError('Thiếu token lời mời.');
    }

    const invitation = await orgService.getInvitationByToken(token);
    res.status(200).json({ success: true, invitation });
  } catch (err) {
    next(err);
  }
}

export async function acceptInvitationHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { token } = req.params as { token: string };

    if (!userId) {
      throw new ValidationError('Yêu cầu đăng nhập.');
    }
    if (!token) {
      throw new ValidationError('Thiếu token lời mời.');
    }

    const member = await orgService.acceptInvitation(token, userId);
    res.status(200).json({ success: true, member });
  } catch (err) {
    next(err);
  }
}

export async function declineInvitationHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { token } = req.params as { token: string };

    if (!userId) {
      throw new ValidationError('Yêu cầu đăng nhập.');
    }
    if (!token) {
      throw new ValidationError('Thiếu token lời mời.');
    }

    await orgService.declineInvitation(token, userId);
    res.status(200).json({ success: true, message: 'Đã từ chối lời mời tham gia tổ chức.' });
  } catch (err) {
    next(err);
  }
}

export async function updateMemberStatusHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, memberId } = req.params as { id: string; memberId: string };
    const { status } = req.body;
    const currentUserId = req.user?.userId;

    if (!id || !memberId) {
      throw new ValidationError('Thiếu mã tổ chức hoặc mã thành viên.');
    }
    if (!status) {
      throw new ValidationError('Vui lòng cung cấp trạng thái mới.');
    }

    const member = await prisma.organizationMember.findUnique({ where: { id: memberId } });
    if (member && currentUserId && (member.userId === currentUserId || member.id === currentUserId)) {
      res.status(403).json({
        success: false,
        message: 'Bạn không thể tự thay đổi trạng thái của chính mình.',
      });
      return;
    }

    const updated = await orgService.updateMemberStatus(id, memberId, status);
    res.status(200).json({ success: true, member: updated });
  } catch (err) {
    next(err);
  }
}

export async function resendInvitationHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, invitationId } = req.params as { id: string; invitationId: string };
    if (!id || !invitationId) {
      throw new ValidationError('Thiếu mã tổ chức hoặc mã lời mời.');
    }

    const invitation = await orgService.resendInvitation(id, invitationId);
    res.status(200).json({ success: true, invitation, message: 'Đã gửi lại lời mời thành công.' });
  } catch (err) {
    next(err);
  }
}

export async function getMyTasksHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    const userId = req.user?.userId;
    const { projectId, priority } = req.query as { projectId?: string; priority?: string };

    if (!id) {
      throw new ValidationError('Mã tổ chức không được để trống.');
    }
    if (!userId) {
      throw new ValidationError('Yêu cầu đăng nhập.');
    }

    const tasks = await orgService.getMyTasksInOrg(id, userId, { projectId, priority });
    res.status(200).json({ success: true, tasks });
  } catch (err) {
    next(err);
  }
}

export async function getDashboardSummaryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    const userId = req.user?.userId;

    if (!id) {
      throw new ValidationError('Mã tổ chức không được để trống.');
    }
    if (!userId) {
      throw new ValidationError('Yêu cầu đăng nhập.');
    }

    const summary = await orgService.getDashboardSummary(id, userId);
    res.status(200).json({ success: true, summary });
  } catch (err) {
    next(err);
  }
}

export async function getOrganizationActivitiesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    if (!id) {
      throw new ValidationError('Mã tổ chức không được để trống.');
    }

    const activities = await orgService.getOrganizationActivities(id, limit);
    res.status(200).json({ success: true, activities });
  } catch (err) {
    next(err);
  }
}
