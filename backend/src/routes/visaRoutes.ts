import express from 'express';
import * as visaController from '../controllers/visaController';
import { protect } from '../middleware/authMiddleware';
import { authorizeRoles } from '../middleware/authorize';
import { UserRole } from '../models/User';

const router = express.Router();

router.use(protect);

router.get('/student', authorizeRoles(UserRole.STUDENT), visaController.getStudentVisa);
router.get('/admin', authorizeRoles(UserRole.ADMIN), visaController.getAdminVisaOverview);
router.put('/admin/:studentId', authorizeRoles(UserRole.ADMIN), visaController.updateVisaStatus);

export default router;
