import express from 'express';
import * as courseEquivalencyController from '../controllers/courseEquivalencyController';
import { authorize, protect } from '../middleware/authMiddleware';
import { UserRole } from '../models/User';

const router = express.Router();

router.use(protect);

router.get('/host-courses', authorize(UserRole.STUDENT, UserRole.ADVISOR, UserRole.ADMIN), courseEquivalencyController.getHostCourses);
router.get('/home-courses', authorize(UserRole.ADVISOR, UserRole.ADMIN), courseEquivalencyController.getHomeCourses);

router.get('/student/requests', authorize(UserRole.STUDENT), courseEquivalencyController.getStudentRequests);
router.post('/student/requests', authorize(UserRole.STUDENT), courseEquivalencyController.createStudentRequest);

router.get('/advisor/requests', authorize(UserRole.ADVISOR), courseEquivalencyController.getAdvisorRequests);
router.get('/advisor/requests/:id', authorize(UserRole.ADVISOR), courseEquivalencyController.getAdvisorRequestById);
router.put('/advisor/requests/:id/items/:itemId/home-course', authorize(UserRole.ADVISOR), courseEquivalencyController.updateHomeCourseSelection);
router.post('/advisor/requests/:id/items/:itemId/run-match', authorize(UserRole.ADVISOR), courseEquivalencyController.runMatch);
router.put('/advisor/requests/:id/decision', authorize(UserRole.ADVISOR), courseEquivalencyController.submitAdvisorDecision);

export default router;
