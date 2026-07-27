import { createHash, randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from '@repo/database';
import {
  EmailAlreadyExistsError,
  UsernameAlreadyExistsError,
  InvalidCredentialsError,
  TokenExpiredError,
  TokenInvalidError,
  UserNotFoundError,
} from '../../common/errors';

// ─── Constants ───────────────────────────────────────────────
const SALT_ROUNDS = 12;
const ACCESS_TOKEN_TTL = '30d';
const REFRESH_TOKEN_DAYS_DEFAULT = 7;
const REFRESH_TOKEN_DAYS_REMEMBER = 30;

// HS512 requires a key of at least 64 bytes
function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set.');
  }
  return new TextEncoder().encode(secret);
}

// ─── Helpers ─────────────────────────────────────────────────
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// ─── Service ─────────────────────────────────────────────────

/**
 * Register a new user.
 */
export async function register(
  username: string,
  email: string | undefined,
  password: string,
  fullName: string,
) {
  // Check if username is already taken
  const existingUsername = await prisma.user.findUnique({ where: { username } });
  if (existingUsername) {
    throw new UsernameAlreadyExistsError();
  }

  // Check if email is already taken (if email was provided)
  if (email) {
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      throw new EmailAlreadyExistsError();
    }
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
      fullName,
    },
    select: {
      id: true,
      username: true,
      email: true,
      fullName: true,
      avatarUrl: true,
    },
  });

  return user;
}

/**
 * Authenticate a user with username + password.
 * Returns the user info and a pair of tokens.
 */
export async function login(username: string, password: string, rememberMe = false) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    throw new InvalidCredentialsError();
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    throw new InvalidCredentialsError();
  }

  // Update last login timestamp
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const accessToken = await generateAccessToken(user.id, user.username, user.email);
  const refreshToken = await generateRefreshToken(user.id, rememberMe);

  const profile = await getUserProfile(user.id);

  return {
    user: profile,
    accessToken,
    refreshToken,
  };
}

/**
 * Get user profile details along with their highest organization role.
 */
export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      fullName: true,
      avatarUrl: true,
      memberships: {
        select: {
          role: true,
        },
      },
    },
  });

  if (!user) {
    throw new UserNotFoundError();
  }

  // Determine the highest role across memberships
  let highestRole: string | null = null;
  if (user.memberships && user.memberships.length > 0) {
    const roles = user.memberships.map((m) => m.role);
    if (roles.includes('OWNER')) {
      highestRole = 'OWNER';
    } else if (roles.includes('ADMIN')) {
      highestRole = 'ADMIN';
    } else if (roles.includes('MEMBER')) {
      highestRole = 'MEMBER';
    } else if (roles.includes('GUEST')) {
      highestRole = 'GUEST';
    }
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    role: highestRole,
  };
}

/**
 * Refresh tokens using a valid refresh token.
 * Implements rotation: old token is revoked, new pair is issued.
 * Reuse detection: if a revoked token is reused, ALL user tokens are revoked.
 */
export async function refreshTokens(oldRawToken: string) {
  const oldHash = hashToken(oldRawToken);

  const storedToken = await prisma.refreshToken.findFirst({
    where: { tokenHash: oldHash },
    include: { user: true },
  });

  if (!storedToken) {
    throw new TokenInvalidError();
  }

  // Reuse detection: if this token was already revoked, someone stole it.
  // Revoke ALL tokens for this user as a safety measure.
  if (storedToken.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: storedToken.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new TokenInvalidError('Token reuse detected. All sessions have been revoked.');
  }

  // Check expiration
  if (storedToken.expiresAt < new Date()) {
    // Mark as revoked for cleanup
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });
    throw new TokenExpiredError('Refresh token has expired.');
  }

  // Rotation: revoke old token
  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revokedAt: new Date() },
  });

  // For refresh token rotation, we preserve the "rememberMe" scope based on remaining expiry duration,
  // but simpler to check if the old token was created with > 7 days remaining or we just re-issue with default
  // 7 days since rotation runs on active clients.
  const timeDifference = storedToken.expiresAt.getTime() - new Date().getTime();
  const isLongTerm = timeDifference > 7 * 24 * 60 * 60 * 1000;

  // Issue new pair
  const accessToken = await generateAccessToken(
    storedToken.user.id,
    storedToken.user.username,
    storedToken.user.email,
  );
  const refreshToken = await generateRefreshToken(storedToken.userId, isLongTerm);

  const profile = await getUserProfile(storedToken.user.id);

  return {
    user: profile,
    accessToken,
    refreshToken,
    rememberMe: isLongTerm,
  };
}

/**
 * Logout: revoke the refresh token.
 */
export async function logout(rawRefreshToken: string) {
  const tokenHash = hashToken(rawRefreshToken);

  // Revoke if exists and not yet revoked
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Verify an access token and return its payload.
 */
export async function verifyAccessToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: ['HS512'],
    });
    return payload as { userId: string; username: string; email: string | null };
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('exp')) {
      throw new TokenExpiredError();
    }
    throw new TokenInvalidError();
  }
}

// ─── Token generators (internal) ─────────────────────────────

async function generateAccessToken(
  userId: string,
  username: string,
  email: string | null,
): Promise<string> {
  return new SignJWT({ userId, username, email })
    .setProtectedHeader({ alg: 'HS512' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(getJwtSecret());
}

async function generateRefreshToken(userId: string, rememberMe = false): Promise<string> {
  const rawToken = randomUUID();
  const tokenHash = hashToken(rawToken);

  const expiresAt = new Date();
  const days = rememberMe ? REFRESH_TOKEN_DAYS_REMEMBER : REFRESH_TOKEN_DAYS_DEFAULT;
  expiresAt.setDate(expiresAt.getDate() + days);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  // Return raw token — this is what gets stored in the cookie
  return rawToken;
}
