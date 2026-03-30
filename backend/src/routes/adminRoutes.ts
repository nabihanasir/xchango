import express from 'express';
import * as adminController from '../controllers/adminController';
import { protect, authorize } from '../middleware/authMiddleware';
import { UserRole } from '../models/User';

const router = express.Router();

router.use(protect);
router.use(authorize(UserRole.ADMIN));

router.get('/stats', adminController.getDashboardStats);
router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.post('/offer-letter', adminController.uploadOfferLetter);
router.get('/mappings', adminController.getCourseMappings);
router.post('/mappings', adminController.addCourseMapping);
router.post('/universities', adminController.addUniversity);
router.post('/courses', adminController.addCourse);

export default router;
