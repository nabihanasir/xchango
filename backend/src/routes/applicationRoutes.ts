import express from 'express';
import * as applicationController from '../controllers/applicationController';
import { protect } from '../middleware/authMiddleware';
import { createUploader } from '../utils/upload';

const router = express.Router();
const applicationDocumentUpload = createUploader('application-documents');

router.post('/', protect, applicationController.createApplication);
router.get('/student/:studentId', protect, applicationController.getStudentApplications);
router.get('/:id', protect, applicationController.getApplication);
router.patch('/:id', protect, applicationController.updateApplicationStep);
router.post('/:id/submit', protect, applicationController.submitApplication);
router.post('/:id/interview', protect, applicationController.scheduleInterview);
router.patch('/:id/status', protect, applicationController.updateStatus);
router.post('/:id/documents', protect, applicationDocumentUpload.array('files'), applicationController.uploadDocuments);
router.post('/:id/courses', protect, applicationController.selectCourses);

export default router;
