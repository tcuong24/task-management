import { AppError } from './app-error';

export class InvalidCredentialsError extends AppError {
  constructor(message = 'Email or password is incorrect.') {
    super(401, 'INVALID_CREDENTIALS', message);
  }
}

export class TokenExpiredError extends AppError {
  constructor(message = 'Token has expired.') {
    super(401, 'TOKEN_EXPIRED', message);
  }
}

export class TokenInvalidError extends AppError {
  constructor(message = 'Token is invalid.') {
    super(401, 'TOKEN_INVALID', message);
  }
}

export class EmailAlreadyExistsError extends AppError {
  constructor(message = 'An account with this email already exists.') {
    super(409, 'EMAIL_ALREADY_EXISTS', message);
  }
}

export class UsernameAlreadyExistsError extends AppError {
  constructor(message = 'This username is already taken.') {
    super(409, 'USERNAME_ALREADY_EXISTS', message);
  }
}

export class UserNotFoundError extends AppError {
  constructor(message = 'User not found.') {
    super(404, 'USER_NOT_FOUND', message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, 'VALIDATION_ERROR', message);
  }
}
