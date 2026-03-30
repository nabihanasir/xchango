import express from 'express';
import * as chatController from '../controllers/chatController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

router.get('/conversations', chatController.getConversations);
router.get('/messages/:conversationId', chatController.getMessages);
router.post('/conversations', chatController.startConversation);
router.post('/messages', chatController.sendMessage);

export default router;
