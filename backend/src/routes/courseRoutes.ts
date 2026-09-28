import express from 'express';
import * as courseController from '../controllers/courseController';
import { protect } from '../middleware/authMiddleware';
import { authorizeRoles } from '../middleware/authorize';
import { UserRole } from '../models/User';

const router = express.Router();

router.use(protect);

router.get('/', authorizeRoles(UserRole.STUDENT, UserRole.ADVISOR, UserRole.ADMIN), courseController.getCourses);
router.get('/host', authorizeRoles(UserRole.ADMIN), courseController.getHostCourses);
router.post('/', authorizeRoles(UserRole.ADMIN), courseController.addCourse);
router.patch('/:id/instructor', authorizeRoles(UserRole.ADMIN), courseController.updateCourseInstructor);
router.put('/:id', authorizeRoles(UserRole.ADMIN), courseController.updateCourse);
router.delete('/:id', authorizeRoles(UserRole.ADMIN), courseController.deleteCourse);

export default router;
