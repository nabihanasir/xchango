"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessage = exports.startConversation = exports.getMessages = exports.getConversations = void 0;
const Conversation_1 = __importDefault(require("../models/Conversation"));
const Message_1 = __importDefault(require("../models/Message"));
const response_1 = require("../utils/response");
const getConversations = async (req, res) => {
    const conversations = await Conversation_1.default.find({
        participants: req.user._id,
    }).populate('participants', 'name role email').populate('lastMessage');
    (0, response_1.sendResponse)(res, 200, 'Conversations fetched successfully', conversations);
};
exports.getConversations = getConversations;
const getMessages = async (req, res) => {
    const { conversationId } = req.params;
    const messages = await Message_1.default.find({ conversation: conversationId }).sort({ createdAt: 1 });
    (0, response_1.sendResponse)(res, 200, 'Messages fetched successfully', messages);
};
exports.getMessages = getMessages;
const startConversation = async (req, res) => {
    const { participantId } = req.body;
    let conversation = await Conversation_1.default.findOne({
        participants: { $all: [req.user._id, participantId], $size: 2 }
    });
    if (!conversation) {
        conversation = await Conversation_1.default.create({
            participants: [req.user._id, participantId]
        });
    }
    (0, response_1.sendResponse)(res, 201, 'Conversation started', conversation);
};
exports.startConversation = startConversation;
const sendMessage = async (req, res) => {
    const { conversationId, text } = req.body;
    const message = await Message_1.default.create({
        conversation: conversationId,
        sender: req.user._id,
        text
    });
    await Conversation_1.default.findByIdAndUpdate(conversationId, { lastMessage: message._id });
    (0, response_1.sendResponse)(res, 201, 'Message sent', message);
};
exports.sendMessage = sendMessage;
