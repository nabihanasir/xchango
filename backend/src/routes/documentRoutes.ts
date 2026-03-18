import express from 'express';
import * as documentController from '../controllers/documentController';
import { protect } from '../middleware/authMiddleware';
import upload from '../utils/upload';

const router = express.Router();

router.post('/upload', protect, upload.single('file'), documentController.uploadDocument);
router.get('/', protect, documentController.getMyDocuments);

export default router;
