import { Request, Response, NextFunction } from 'express';
import type { CookieOptions } from 'express';
import * as authService from './auth.service';
import { validateRegisterInput, validateLoginInput } from './auth.validation';
import { TokenInvalidError } from '../../common/errors';

// ─── Cookie helpers ──────────────────────────────────────────
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function getCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: IS_PRODUCTION,
    // Netlify and Render are different sites without a custom domain.
    sameSite: IS_PRODUCTION ? 'none' : 'lax',
    path: '/',
  };
}

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

    const cookieOptions = getCookieOptions();

    res.cookie('access_token', result.accessToken, {
      ...cookieOptions,
      maxAge: cookieMaxAge,
    });
    res.cookie('refresh_token', result.refreshToken, {
      ...cookieOptions,
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

    const cookieOptions = getCookieOptions();

    res.cookie('access_token', result.accessToken, {
      ...cookieOptions,
      maxAge: cookieMaxAge,
    });
    res.cookie('refresh_token', result.refreshToken, {
      ...cookieOptions,
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

    // Cookie clearing must use the same attributes used when setting it.
    const cookieOptions = getCookieOptions();
    res.clearCookie('access_token', cookieOptions);
    res.clearCookie('refresh_token', cookieOptions);

    res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
}
