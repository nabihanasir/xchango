import { NextFunction, Response } from 'express';
import { AuthenticationError, ForbiddenError } from '../errors/AppError';
import { UserRole } from '../models/User';

export const authorizeRoles = (...roles: UserRole[]) => {
  return (req: any, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(
        new AuthenticationError(
          'Authentication required.',
          'No authenticated user was attached to the request.',
          'Sign in and try again.',
          'AUTH_REQUIRED'
        )
      );
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          'Access denied.',
          `User role ${req.user.role} is not authorized to access this route.`,
          'Use an account with the required role and try again.',
          'ROLE_NOT_ALLOWED'
        )
      );
    }

    next();
  };
};
