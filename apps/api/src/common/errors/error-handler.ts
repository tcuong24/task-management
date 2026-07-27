import { Request, Response, NextFunction } from 'express';
import { AppError } from './app-error';

export function globalErrorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Known application errors
  if (err instanceof AppError) {
    res.status(err.httpStatus).json({
      success: false,
      errorCode: err.errorCode,
      message: err.message,
    });
    return;
  }

  // Unknown / unexpected errors
  console.error('Unhandled error:', err);

  const isProduction = process.env.NODE_ENV === 'production';

  res.status(500).json({
    success: false,
    errorCode: 'INTERNAL_ERROR',
    message: isProduction
      ? 'An unexpected error occurred.'
      : err.message || 'An unexpected error occurred.',
  });
}
