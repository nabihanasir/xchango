import express from 'express';
import * as programOutlineController from '../controllers/programOutlineController';
import { protect } from '../middleware/authMiddleware';
import { authorizeRoles } from '../middleware/authorize';
import { UserRole } from '../models/User';
import { programOutlineUpload } from '../utils/upload';

const router = express.Router();

router.use(protect);

router.post(
  '/upload',
  authorizeRoles(UserRole.STUDENT),
  programOutlineUpload.single('file'),
  programOutlineController.uploadProgramOutline
);
router.get('/me', authorizeRoles(UserRole.STUDENT), programOutlineController.getProgramOutline);
router.get(
  '/student/:studentId',
  authorizeRoles(UserRole.STUDENT, UserRole.ADVISOR, UserRole.ADMIN),
  programOutlineController.getProgramOutline
);
router.put('/student/:studentId', authorizeRoles(UserRole.ADVISOR), programOutlineController.updateProgramOutline);

export default router;
