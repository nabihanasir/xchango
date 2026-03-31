import express from 'express';
import * as studentController from '../controllers/studentController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

router.get('/profile', studentController.getProfile);
router.put('/profile', studentController.updateProfile);
router.get('/:id', studentController.getStudentById);
router.put('/:id', studentController.updateStudentById);

export default router;
