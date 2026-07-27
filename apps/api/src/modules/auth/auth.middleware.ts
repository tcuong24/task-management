import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { TokenInvalidError } from '../../common/errors';

// Extend Express Request to include the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        email: string | null;
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
    req.user = payload;

    next();
  } catch (err) {
    next(err);
  }
}
