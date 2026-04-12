import express from 'express';
import * as applicationController from '../controllers/applicationController';
import { protect } from '../middleware/authMiddleware';
import { authorizeRoles } from '../middleware/authorize';
import { createUploader } from '../utils/upload';
import { UserRole } from '../models/User';

const router = express.Router();
const applicationDocumentUpload = createUploader('application-documents');

router.use(protect);

router.post('/', authorizeRoles(UserRole.STUDENT), applicationController.createApplication);
router.get(
  '/student/:studentId',
  authorizeRoles(UserRole.STUDENT, UserRole.ADMIN),
  applicationController.getStudentApplications
);
router.get('/advisor', authorizeRoles(UserRole.ADVISOR), applicationController.getAdvisorApplications);
router.get('/:id', applicationController.getApplication);
router.get(
  '/:id/available-courses',
  authorizeRoles(UserRole.STUDENT, UserRole.ADVISOR, UserRole.ADMIN),
  applicationController.getAvailableCourses
);
router.get(
  '/:id/ai-recommendations',
  authorizeRoles(UserRole.ADVISOR),
  applicationController.getAiRecommendations
);
router.patch('/:id', authorizeRoles(UserRole.STUDENT), applicationController.updateApplicationStep);
router.post('/:id/submit', authorizeRoles(UserRole.STUDENT), applicationController.submitApplication);
router.patch('/:id/assign-advisor', authorizeRoles(UserRole.ADMIN), applicationController.assignAdvisor);
router.patch('/:id/schedule-interview', authorizeRoles(UserRole.ADVISOR), applicationController.scheduleInterview);
router.post('/:id/interview', authorizeRoles(UserRole.ADVISOR), applicationController.scheduleInterview);
router.patch('/:id/status', authorizeRoles(UserRole.ADVISOR), applicationController.updateStatus);
router.post(
  '/:id/ai-recommendations',
  authorizeRoles(UserRole.ADVISOR),
  applicationController.generateAiRecommendations
);
router.put(
  '/:id/course-decision',
  authorizeRoles(UserRole.ADVISOR),
  applicationController.updateCourseDecision
);
router.post(
  '/:id/documents',
  authorizeRoles(UserRole.STUDENT),
  applicationDocumentUpload.array('files'),
  applicationController.uploadDocuments
);
router.post('/:id/courses', authorizeRoles(UserRole.STUDENT), applicationController.selectCourses);

export default router;
