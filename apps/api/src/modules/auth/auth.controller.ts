import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { validateRegisterInput, validateLoginInput } from './auth.validation';
import { TokenInvalidError } from '../../common/errors';

// ─── Cookie helpers ──────────────────────────────────────────
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: 'lax' as const,
  path: '/',
};

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: 'lax' as const,
  path: '/',
};

// ─── Handlers ────────────────────────────────────────────────

export async function registerHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const input = validateRegisterInput(req.body);
    const user = await authService.register(
      input.username,
      input.email,
      input.password,
      input.fullName,
    );

    res.status(201).json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

export async function loginHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const input = validateLoginInput(req.body);
    const result = await authService.login(input.username, input.password, input.rememberMe);

    // Set cookies matching session lifespan (7 days default, 30 days for Remember Me)
    const cookieMaxAge = input.rememberMe
      ? 30 * 24 * 60 * 60 * 1000 // 30 days
      : 7 * 24 * 60 * 60 * 1000; // 7 days

    res.cookie('access_token', result.accessToken, {
      ...ACCESS_COOKIE_OPTIONS,
      maxAge: cookieMaxAge,
    });
    res.cookie('refresh_token', result.refreshToken, {
      ...REFRESH_COOKIE_OPTIONS,
      maxAge: cookieMaxAge,
    });

    res.status(200).json({ success: true, user: result.user });
  } catch (err) {
    next(err);
  }
}

export async function refreshHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const oldRefreshToken = req.cookies?.refresh_token;
    if (!oldRefreshToken) {
      throw new TokenInvalidError('No refresh token provided.');
    }

    const result = await authService.refreshTokens(oldRefreshToken);

    // Set new cookies matching session lifespan
    const cookieMaxAge = result.rememberMe
      ? 30 * 24 * 60 * 60 * 1000
      : 7 * 24 * 60 * 60 * 1000;

    res.cookie('access_token', result.accessToken, {
      ...ACCESS_COOKIE_OPTIONS,
      maxAge: cookieMaxAge,
    });
    res.cookie('refresh_token', result.refreshToken, {
      ...REFRESH_COOKIE_OPTIONS,
      maxAge: cookieMaxAge,
    });

    res.status(200).json({ success: true, user: result.user });
  } catch (err) {
    next(err);
  }
}

export async function logoutHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    // Clear cookies
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });

    res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
}
