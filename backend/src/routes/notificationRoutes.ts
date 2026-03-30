import express from 'express';
import * as notificationController from '../controllers/notificationController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

router.get('/', notificationController.getMyNotifications);
router.put('/:id/read', notificationController.markAsRead);

export default router;
