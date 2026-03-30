import { Response } from 'express';
import Conversation from '../models/Conversation';
import Message from '../models/Message';
import { sendResponse } from '../utils/response';

export const getConversations = async (req: any, res: Response) => {
  const conversations = await Conversation.find({
    participants: req.user._id,
  }).populate('participants', 'name role email').populate('lastMessage');
  
  sendResponse(res, 200, 'Conversations fetched successfully', conversations);
};

export const getMessages = async (req: any, res: Response) => {
  const { conversationId } = req.params;
  const messages = await Message.find({ conversation: conversationId }).sort({ createdAt: 1 });
  sendResponse(res, 200, 'Messages fetched successfully', messages);
};

export const startConversation = async (req: any, res: Response) => {
  const { participantId } = req.body;
  
  let conversation = await Conversation.findOne({
    participants: { $all: [req.user._id, participantId], $size: 2 }
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [req.user._id, participantId]
    });
  }

  sendResponse(res, 201, 'Conversation started', conversation);
};

export const sendMessage = async (req: any, res: Response) => {
  const { conversationId, text } = req.body;
  
  const message = await Message.create({
    conversation: conversationId,
    sender: req.user._id,
    text
  });

  await Conversation.findByIdAndUpdate(conversationId, { lastMessage: message._id });

  sendResponse(res, 201, 'Message sent', message);
};
