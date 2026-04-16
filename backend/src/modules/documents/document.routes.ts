import express from 'express';
import { protect } from '../../middleware/authMiddleware';
import { documentUpload } from '../../utils/upload';
import * as documentController from './document.controller';

const router = express.Router();

router.post('/upload', protect, documentUpload.single('file'), documentController.uploadDocument);
router.get('/student/:studentId', protect, documentController.getStudentDocuments);
router.delete('/:id', protect, documentController.deleteDocumentById);
router.patch('/:id/status', protect, documentController.updateDocumentReviewStatus);

export default router;
