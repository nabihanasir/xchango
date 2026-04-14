import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { AuthenticationError } from '../errors/AppError';
import { asyncHandler } from './asyncHandler';

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
