import express from 'express';
import * as advisorController from '../controllers/advisorController';
import { protect } from '../middleware/authMiddleware';
import { authorizeRoles } from '../middleware/authorize';
import { UserRole } from '../models/User';

const router = express.Router();

router.use(protect);
router.use(authorizeRoles(UserRole.ADVISOR));

router.get('/profile', advisorController.getProfile);
router.get('/applications', advisorController.getAssignedApps);
router.get('/students', advisorController.getAssignedStudents);
router.put('/applications/:id', advisorController.updateApplicationStatus);

export default router;
