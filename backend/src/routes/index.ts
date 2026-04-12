import express from 'express';
import authRoutes from './authRoutes';
import studentRoutes from './studentRoutes';
import advisorRoutes from './advisorRoutes';
import adminRoutes from './adminRoutes';
import userRoutes from './userRoutes';
import documentRoutes from './documentRoutes';
import chatRoutes from './chatRoutes';
import notificationRoutes from './notificationRoutes';
import courseEquivalencyRoutes from './courseEquivalencyRoutes';
import transcriptRoutes from './transcriptRoutes';
import applicationRoutes from './applicationRoutes';
import catalogRoutes from './catalogRoutes';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/students', studentRoutes);
router.use('/advisors', advisorRoutes);
router.use('/admin', adminRoutes);
router.use('/documents', documentRoutes);
router.use('/transcript', transcriptRoutes);
router.use('/applications', applicationRoutes);
router.use('/catalog', catalogRoutes);
router.use('/chat', chatRoutes);
router.use('/notifications', notificationRoutes);
router.use('/equivalency', courseEquivalencyRoutes);

export default router;
