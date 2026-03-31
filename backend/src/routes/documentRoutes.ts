import express from 'express';
import * as documentController from '../controllers/documentController';
import { protect } from '../middleware/authMiddleware';
import { documentUpload } from '../utils/upload';

const router = express.Router();

router.post('/upload', protect, documentUpload.single('file'), documentController.uploadDocument);
router.get('/:studentId', protect, documentController.getStudentDocuments);
router.delete('/:docId', protect, documentController.deleteDocument);

export default router;
