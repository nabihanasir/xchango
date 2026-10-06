import express from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { askAssistant, AssistantTurn } from '../services/faqAssistantService';
import { sendResponse } from '../utils/response';

const router = express.Router();

// The widget is on public pages too, so this route is open; throttle per IP to protect the LLM quota.
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 15;
const hits = new Map<string, { count: number; resetAt: number }>();

const throttle: express.RequestHandler = (req, res, next) => {
  const now = Date.now();
  const key = req.ip || 'unknown';
  const entry = hits.get(key);

  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  entry.count += 1;
  if (entry.count > MAX_REQUESTS_PER_WINDOW) {
    return sendResponse(res, 429, 'Too many questions. Please wait a minute and try again.', null);
  }
  return next();
};

router.post(
  '/ask',
  throttle,
  asyncHandler(async (req, res) => {
    const { message, history } = req.body ?? {};
    if (typeof message !== 'string' || !message.trim()) {
      return sendResponse(res, 400, 'A message is required.', null);
    }

    const turns: AssistantTurn[] = Array.isArray(history)
      ? history.filter(
          (turn: any) => (turn?.role === 'user' || turn?.role === 'assistant') && typeof turn?.text === 'string'
        )
      : [];

    const reply = await askAssistant(message, turns);
    return sendResponse(res, 200, 'Assistant replied', reply);
  })
);

export default router;
