import express from 'express';
import * as onlineClassController from '../controllers/onlineClassController';
import { protect } from '../middleware/authMiddleware';
import { authorizeRoles } from '../middleware/authorize';
import { UserRole } from '../models/User';

const router = express.Router();

router.use(protect);

router.get(
  '/',
  authorizeRoles(UserRole.STUDENT, UserRole.ADVISOR, UserRole.ADMIN),
  onlineClassController.getOnlineClasses,
);

router.post(
  '/:id/start',
  authorizeRoles(UserRole.ADVISOR, UserRole.ADMIN),
  onlineClassController.startOnlineClass,
);

router.post(
  '/:id/end',
  authorizeRoles(UserRole.ADVISOR, UserRole.ADMIN),
  onlineClassController.endOnlineClass,
);

export default router;
