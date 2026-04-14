import express from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  AuthenticationError,
  DatabaseError,
  NotFoundError,
  ValidationError,
} from '../errors/AppError';

const router = express.Router();

router.get(
  '/validation',
  asyncHandler(async () => {
    throw new ValidationError(
      'Invalid demo input',
      'The example route intentionally simulates invalid request data.',
      'Update the request payload so it matches the required format.',
      'DEMO_VALIDATION_ERROR',
    );
  }),
);

router.get(
  '/auth',
  asyncHandler(async () => {
    throw new AuthenticationError(
      'Demo authentication failed',
      'The example route intentionally simulates an unauthenticated request.',
      'Sign in with valid credentials before retrying this action.',
      'DEMO_AUTH_ERROR',
    );
  }),
);

router.get(
  '/database',
  asyncHandler(async () => {
    throw new DatabaseError(
      'Demo database failure',
      'The example route intentionally simulates a persistence issue.',
      'Retry the request later or inspect the database connection.',
      'DEMO_DATABASE_ERROR',
    );
  }),
);

router.get(
  '/missing',
  asyncHandler(async () => {
    throw new NotFoundError(
      'Demo resource not found',
      'The example route intentionally simulates a missing record.',
      'Check the identifier or create the missing resource first.',
      'DEMO_NOT_FOUND',
    );
  }),
);

export default router;
