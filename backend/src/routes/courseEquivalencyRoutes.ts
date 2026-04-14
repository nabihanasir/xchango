import express from 'express';
import * as courseEquivalencyController from '../controllers/courseEquivalencyController';
import { protect } from '../middleware/authMiddleware';
import { authorizeRoles } from '../middleware/authorize';
import { requireInterviewCompleted } from '../middleware/workflowAccess';
import { UserRole } from '../models/User';

const router = express.Router();

router.use(protect);

router.get('/host-courses', authorizeRoles(UserRole.STUDENT, UserRole.ADVISOR, UserRole.ADMIN), courseEquivalencyController.getHostCourses);
router.get('/home-courses', authorizeRoles(UserRole.ADVISOR, UserRole.ADMIN), courseEquivalencyController.getHomeCourses);

router.get(
  '/student/requests',
  authorizeRoles(UserRole.STUDENT),
  requireInterviewCompleted,
  courseEquivalencyController.getStudentRequests
);
router.post(
  '/student/requests',
  authorizeRoles(UserRole.STUDENT),
  requireInterviewCompleted,
  courseEquivalencyController.createStudentRequest
);

router.get('/advisor/requests', authorizeRoles(UserRole.ADVISOR), courseEquivalencyController.getAdvisorRequests);
router.get('/advisor/requests/:id', authorizeRoles(UserRole.ADVISOR), courseEquivalencyController.getAdvisorRequestById);
router.put('/advisor/requests/:id/items/:itemId/home-course', authorizeRoles(UserRole.ADVISOR), courseEquivalencyController.updateHomeCourseSelection);
router.post('/advisor/requests/:id/items/:itemId/run-match', authorizeRoles(UserRole.ADVISOR), courseEquivalencyController.runMatch);
router.put('/advisor/requests/:id/decision', authorizeRoles(UserRole.ADVISOR), courseEquivalencyController.submitAdvisorDecision);

export default router;
