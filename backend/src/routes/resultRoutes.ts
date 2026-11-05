import express from 'express';
import * as resultController from '../controllers/resultController';
import { protect } from '../middleware/authMiddleware';
import { authorizeRoles } from '../middleware/authorize';
import { resultUpload, verificationUpload } from '../utils/upload';
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

router.get('/verification/student', authorizeRoles(UserRole.STUDENT), resultController.getStudentVerification);
router.post(
  '/verification/student',
  authorizeRoles(UserRole.STUDENT),
  verificationUpload.single('file'),
  resultController.submitStudentVerification
);
router.get('/verification/advisor', authorizeRoles(UserRole.ADVISOR), resultController.getAdvisorVerifications);
router.put('/verification/advisor/:id', authorizeRoles(UserRole.ADVISOR), resultController.reviewVerification);
router.get('/verification/admin', authorizeRoles(UserRole.ADMIN), resultController.getAllVerificationsForAdmin);

export default router;
