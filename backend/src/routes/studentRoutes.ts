import express from 'express';
import * as studentController from '../controllers/studentController';
import { protect } from '../middleware/authMiddleware';
import { authorizeRoles } from '../middleware/authorize';
import { UserRole } from '../models/User';

const router = express.Router();

router.use(protect);

router.get('/profile', authorizeRoles(UserRole.STUDENT), studentController.getProfile);
router.put('/profile', authorizeRoles(UserRole.STUDENT), studentController.updateProfile);
router.get('/:id', studentController.getStudentById);
router.put('/:id', authorizeRoles(UserRole.STUDENT, UserRole.ADMIN), studentController.updateStudentById);

export default router;
