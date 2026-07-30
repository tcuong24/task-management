import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { AppError, TokenInvalidError } from '../../common/errors';
import { prisma } from '@repo/database';

// Extend Express Request to include the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        email: string | null;
        platformRole: 'USER' | 'ADMIN';
        status: 'ACTIVE' | 'SUSPENDED';
      };
    }
  }
}

/**
 * Middleware that protects routes by verifying the access token cookie.
 * On success, attaches `req.user` with { userId, email }.
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const accessToken = req.cookies?.access_token;
    if (!accessToken) {
      throw new TokenInvalidError('Authentication required.');
    }

    const payload = await authService.verifyAccessToken(accessToken);
    const account = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { platformRole: true, status: true },
    });

    if (!account) {
      throw new TokenInvalidError('Tài khoản không còn tồn tại.');
    }
    if (account.status === 'SUSPENDED') {
      throw new AppError(403, 'ACCOUNT_SUSPENDED', 'Tài khoản đã bị khóa.');
    }

    req.user = { ...payload, ...account };

    next();
  } catch (err) {
    next(err);
  }
}
