import { NextFunction, Response } from 'express';
import { UserRole } from '../models/User';

export const authorizeRoles = (...roles: UserRole[]) => {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `User role ${req.user.role} is not authorized to access this route`,
      });
    }

    next();
  };
};
