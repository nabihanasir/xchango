import express from 'express';
import * as resultController from '../controllers/resultController';
import { protect } from '../middleware/authMiddleware';
import { authorizeRoles } from '../middleware/authorize';
import { resultUpload } from '../utils/upload';
import { UserRole } from '../models/User';

const router = express.Router();

router.use(protect);

router.get('/student', authorizeRoles(UserRole.STUDENT), resultController.getStudentResults);
router.get('/advisor/gradable', authorizeRoles(UserRole.ADVISOR), resultController.getAdvisorGradableItems);
router.put(
  '/advisor/:courseRequestItemId',
  authorizeRoles(UserRole.ADVISOR),
  resultUpload.single('file'),
  resultController.upsertResult
);
router.get('/admin', authorizeRoles(UserRole.ADMIN), resultController.getAllResultsForAdmin);

export default router;
