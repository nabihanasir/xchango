import express from 'express';
import * as advisorController from '../controllers/advisorController';
import { protect, authorize } from '../middleware/authMiddleware';
import { UserRole } from '../models/User';

const router = express.Router();

router.use(protect);
router.use(authorize(UserRole.ADVISOR));

router.get('/profile', advisorController.getProfile);
router.get('/applications', advisorController.getAssignedApps);
router.put('/applications/:id', advisorController.updateApplicationStatus);

export default router;
