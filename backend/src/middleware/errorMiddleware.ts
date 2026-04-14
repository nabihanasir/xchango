import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import {
  AppError,
  AuthenticationError,
  DatabaseError,
  NotFoundError,
  ValidationError,
} from '../errors/AppError';
import { logger } from '../utils/logger';

const buildError = (err: unknown): AppError => {
  if (err instanceof AppError) {
    return err;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const validationMessage = Object.values(err.errors)
      .map((item) => item.message)
      .join(', ');

    return new ValidationError(
      'Validation failed',
      validationMessage || 'One or more fields contain invalid values.',
      'Please review the submitted fields and correct the highlighted values.',
      'VALIDATION_ERROR',
    );
  }

  if (err instanceof mongoose.Error.CastError) {
    return new ValidationError(
      'Invalid identifier',
      `The value provided for "${err.path}" is not in the expected format.`,
      'Please verify the identifier and try again.',
      'INVALID_IDENTIFIER',
    );
  }

  if (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: number }).code === 11000) {
    const duplicateField = Object.keys((err as { keyPattern?: Record<string, unknown> }).keyPattern || {})[0] || 'value';

    return new ValidationError(
      'Duplicate value',
      `A record already exists with this ${duplicateField}.`,
      `Use a different ${duplicateField} and try again.`,
      'DUPLICATE_VALUE',
    );
  }

  if (err instanceof mongoose.Error) {
    return new DatabaseError(
      'Database operation failed',
      'The database could not complete the requested operation.',
      'Please try again shortly. If the issue continues, contact support.',
    );
  }

  if (err instanceof Error && err.name === 'JsonWebTokenError') {
    return new AuthenticationError(
      'Authentication failed',
      'The provided token is invalid or malformed.',
      'Please sign in again to continue.',
      'INVALID_TOKEN',
    );
  }

  if (err instanceof Error && err.name === 'TokenExpiredError') {
    return new AuthenticationError(
      'Session expired',
      'Your login session is no longer valid.',
      'Please sign in again to continue.',
      'TOKEN_EXPIRED',
    );
  }

  if (err instanceof Error) {
    return new AppError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Unexpected server error',
      reason: err.message || 'An unexpected error occurred on the server.',
      solution: 'Please try again later or contact support if the problem continues.',
      status: 500,
    });
  }

  return new AppError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Unexpected server error',
    reason: 'An unknown error occurred on the server.',
    solution: 'Please try again later or contact support if the problem continues.',
    status: 500,
  });
};

export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const normalizedError = buildError(err);
  const statusCode = normalizedError.status || res.statusCode || 500;
  const requestId = res.locals.requestId || req.headers['x-request-id'];

  logger.error(normalizedError.message, {
    code: normalizedError.code,
    reason: normalizedError.reason,
    path: req.originalUrl,
    method: req.method,
    status: statusCode,
    requestId,
    stack: err instanceof Error ? err.stack : undefined,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      code: normalizedError.code,
      message: normalizedError.message,
      reason: normalizedError.reason,
      solution: normalizedError.solution,
      status: statusCode,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      requestId,
    },
  });
};

export const notFound = (req: Request, _res: Response, next: NextFunction) => {
  next(
    new NotFoundError(
      'Resource not found',
      `No route exists for ${req.method} ${req.originalUrl}.`,
      'Please verify the endpoint path or consult the API documentation.',
      'ROUTE_NOT_FOUND',
    ),
  );
};
