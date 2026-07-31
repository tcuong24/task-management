import { NextFunction, Request, Response } from 'express';
import { ValidationError } from '../../common/errors';
import { globalSearch } from './search.service';
import { validateGlobalSearchQuery } from './search.validation';

export async function globalSearchHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const organizationId = req.params.id;
    const userId = req.user?.userId;
    if (typeof organizationId !== 'string' || !organizationId) {
      throw new ValidationError('Thiếu mã tổ chức.');
    }
    if (!userId) throw new ValidationError('Yêu cầu đăng nhập.');

    const searchQuery = validateGlobalSearchQuery(req.query);
    const data = await globalSearch(organizationId, userId, searchQuery);
    res.status(200).json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
}
