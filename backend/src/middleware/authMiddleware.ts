import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { AuthenticationError, ForbiddenError } from '../errors/AppError';
import { asyncHandler } from './asyncHandler';
import { offboardDueStudents } from '../services/offboardingService';

const READ_ONLY_METHODS = ['GET', 'HEAD', 'OPTIONS'];

interface DecodedToken {
  id: string;
  role: string;
}

export const protect = asyncHandler(async (req: any, _res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as DecodedToken;

    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      throw new AuthenticationError(
        'Authentication failed',
        'The token belongs to a user account that no longer exists.',
        'Please log in again with a valid account.',
        'AUTH_USER_NOT_FOUND',
      );
    }

    if (req.user.role === 'student') {
      if (!req.user.offboardedAt) {
        await offboardDueStudents(req.user._id.toString());
        req.user = await User.findById(decoded.id).select('-password');
      }

      // Off-boarded students keep read-only access to their records.
      if (req.user.offboardedAt && !READ_ONLY_METHODS.includes(req.method)) {
        throw new ForbiddenError(
          'Account off-boarded',
          'Your exchange semester is complete, so this account is now read-only.',
          'Contact the International Office if you need access restored.',
          'ACCOUNT_OFFBOARDED',
        );
      }
    }

    next();
    return;
  }

  if (!token) {
    throw new AuthenticationError(
      'Authentication required',
      'No bearer token was provided with the request.',
      'Please log in and send a valid access token.',
      'TOKEN_MISSING',
    );
  }
});
