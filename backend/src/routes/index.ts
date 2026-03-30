import express from 'express';
import authRoutes from './authRoutes';
import studentRoutes from './studentRoutes';
import advisorRoutes from './advisorRoutes';
import adminRoutes from './adminRoutes';
import documentRoutes from './documentRoutes';
import chatRoutes from './chatRoutes';
import notificationRoutes from './notificationRoutes';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/students', studentRoutes);
router.use('/advisors', advisorRoutes);
router.use('/admin', adminRoutes);
router.use('/documents', documentRoutes);
router.use('/chat', chatRoutes);
router.use('/notifications', notificationRoutes);

export default router;
