import express from 'express';
import * as adminController from '../controllers/adminController';
import { protect } from '../middleware/authMiddleware';
import { authorizeRoles } from '../middleware/authorize';
import { UserRole } from '../models/User';

const router = express.Router();

router.use(protect);
router.use(authorizeRoles(UserRole.ADMIN));

router.get('/', adminController.getUsers);
router.post('/', adminController.createUser);

export default router;
