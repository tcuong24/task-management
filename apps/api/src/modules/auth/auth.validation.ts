import { ValidationError } from '../../common/errors';

interface RegisterInput {
  username: string;
  email?: string;
  password: string;
  fullName: string;
}

interface LoginInput {
  username: string;
  password: string;
  rememberMe?: boolean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;
const MIN_PASSWORD_LENGTH = 8;

export function validateRegisterInput(body: unknown): RegisterInput {
  const { username, email, password, fullName } = (body ?? {}) as Record<string, unknown>;

  if (
    !username ||
    typeof username !== 'string' ||
    !USERNAME_REGEX.test(username.trim())
  ) {
    throw new ValidationError(
      'Username must be between 3 and 30 characters and can only contain letters, numbers, and underscores.'
    );
  }

  if (email !== undefined && email !== null && email !== '') {
    if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      throw new ValidationError('A valid email address is required if provided.');
    }
  }

  if (
    !password ||
    typeof password !== 'string' ||
    password.length < MIN_PASSWORD_LENGTH
  ) {
    throw new ValidationError(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    );
  }

  if (!fullName || typeof fullName !== 'string' || fullName.trim().length === 0) {
    throw new ValidationError('Full name is required.');
  }

  return {
    username: username.trim().toLowerCase(),
    email: email ? email.trim().toLowerCase() : undefined,
    password,
    fullName: fullName.trim(),
  };
}

export function validateLoginInput(body: unknown): LoginInput {
  const { username, password, rememberMe } = (body ?? {}) as Record<string, unknown>;

  if (!username || typeof username !== 'string') {
    throw new ValidationError('Username is required.');
  }

  if (!password || typeof password !== 'string') {
    throw new ValidationError('Password is required.');
  }

  return {
    username: username.trim().toLowerCase(),
    password,
    rememberMe: rememberMe === true,
  };
}
