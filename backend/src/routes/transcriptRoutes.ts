import express from 'express';
import * as transcriptController from '../controllers/transcriptController';
import { protect } from '../middleware/authMiddleware';
import { transcriptUpload } from '../utils/upload';

const router = express.Router();

router.post('/upload', protect, transcriptUpload.single('file'), transcriptController.uploadTranscript);
router.get('/:studentId', protect, transcriptController.getTranscript);

export default router;
