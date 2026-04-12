import express from 'express';
import * as catalogController from '../controllers/catalogController';
import { protect } from '../middleware/authMiddleware';
import { authorizeRoles } from '../middleware/authorize';
import { UserRole } from '../models/User';

const router = express.Router();

router.use(protect);
router.use(authorizeRoles(UserRole.ADMIN, UserRole.ADVISOR, UserRole.STUDENT));

router.get('/countries', catalogController.getCountries);
router.get('/universities', catalogController.getUniversities);
router.get('/courses', catalogController.getCourses);

export default router;
