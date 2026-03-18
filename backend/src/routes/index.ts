import express from 'express';
import authRoutes from './authRoutes';
import studentRoutes from './studentRoutes';
import advisorRoutes from './advisorRoutes';
import adminRoutes from './adminRoutes';
import documentRoutes from './documentRoutes';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/students', studentRoutes);
router.use('/advisors', advisorRoutes);
router.use('/admin', adminRoutes);
router.use('/documents', documentRoutes);

export default router;
