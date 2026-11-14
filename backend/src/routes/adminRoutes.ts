import express from 'express';
import * as adminController from '../controllers/adminController';
import { protect } from '../middleware/authMiddleware';
import { authorizeRoles } from '../middleware/authorize';
import { UserRole } from '../models/User';

const router = express.Router();

router.use(protect);
router.use(authorizeRoles(UserRole.ADMIN));

router.get('/stats', adminController.getDashboardStats);
router.get('/applications', adminController.getApplications);
router.get('/applications/pending', adminController.getPendingApplications);
router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.put('/applications/:id/semester-end', adminController.setSemesterEndDate);
router.put('/users/:id/countries', adminController.updateAdvisorCountries);
router.post('/users/:id/deactivate', adminController.deactivateUser);
router.post('/users/:id/activate', adminController.activateUser);
router.post('/users/:id/reactivate', adminController.reactivateStudent);
router.post('/offer-letter', adminController.uploadOfferLetter);
router.get('/mappings', adminController.getCourseMappings);
router.post('/mappings', adminController.addCourseMapping);
router.get('/universities', adminController.getUniversities);
router.post('/universities/scrape', adminController.scrapeUniversity);
router.post('/universities', adminController.addUniversity);
router.put('/universities/:id', adminController.updateUniversity);
router.post('/host-courses', adminController.addHostCourse);
router.post('/courses', adminController.addCourse);
router.get('/ai-model-config', adminController.getAiModelConfig);
router.put('/ai-model-config', adminController.updateAiModelConfig);

export default router;
