import express from 'express';
import * as studentController from '../controllers/studentController';
import { protect, authorize } from '../middleware/authMiddleware';
import { UserRole } from '../models/User';

const router = express.Router();

router.use(protect);
router.use(authorize(UserRole.STUDENT));

router.get('/profile', studentController.getProfile);
router.put('/profile', studentController.updateProfile);
router.post('/apply', studentController.apply);
router.get('/applications', studentController.getApplications);

export default router;
