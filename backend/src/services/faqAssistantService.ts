import { logger } from '../utils/logger';
import { requestLlmJson } from './aiCourseMatcherService';

export interface FaqEntry {
  topic: 'Applications & deadlines' | 'Visa & arrival' | 'Course equivalency' | 'Accounts & advisors';
  question: string;
  answer: string;
}

export interface AssistantTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface AssistantReply {
  answer: string;
  /** Short tappable follow-up questions the widget can offer as chips. */
  suggestions: string[];
  answeredBy: 'llm' | 'faq';
}

export const FAQ_ENTRIES: FaqEntry[] = [
  {
    topic: 'Applications & deadlines',
    question: 'Who can apply for a student exchange?',
    answer:
      'Any currently enrolled Riphah student in good academic standing can apply. Eligibility for a specific partner university depends on that programme’s course prerequisites and available seats.',
  },
  {
    topic: 'Applications & deadlines',
    question: 'When should I start the application process?',
    answer:
      'Begin at least one full semester ahead. Placement confirmation, transcript review and visa paperwork with the partner university all take time to clear before travel.',
  },
  {
    topic: 'Applications & deadlines',
    question: 'How do I apply and track my application?',
    answer:
      'Complete your profile, then go to Applications > New application and pick a country, university and programme. Upload the required documents and submit. You can follow each stage (review, interview, decision) from the Applications page, and you will get a notification when the status changes.',
  },
  {
    topic: 'Applications & deadlines',
    question: 'Which documents do I need?',
    answer:
      'Typically your transcript, passport copy and any items the partner university lists for its programme. Upload them under Documents; the application checklist shows what is still missing.',
  },
  {
    topic: 'Visa & arrival',
    question: 'How does the visa process work?',
    answer:
      'Once your placement is accepted, your visa process opens under Visa in your dashboard. Submit the requested paperwork there, and the team updates the status as it moves through each step. Processing times depend on the host country, so start early.',
  },
  {
    topic: 'Visa & arrival',
    question: 'What do I do when I arrive at the host university?',
    answer:
      'Mark your arrival in the app once you have landed. After that you can upload the official course outlines you receive at the host university, which are used for the final course match.',
  },
  {
    topic: 'Course equivalency',
    question: 'How is my credit recognised when I come back?',
    answer:
      'Before you travel, an advisor maps each partner course to its Riphah equivalent. On your return, the approved mapping is what gets recorded on your transcript, with no separate re-evaluation needed.',
  },
  {
    topic: 'Course equivalency',
    question: 'How does course matching work?',
    answer:
      'You browse host courses and request an equivalency. The system compares the host course against Riphah home courses and suggests matches with a score, then an advisor reviews and approves. A preliminary match uses the catalogue description; the final match uses the outline you upload at the host university.',
  },
  {
    topic: 'Accounts & advisors',
    question: 'I forgot my password. What do I do?',
    answer:
      'On the login page choose "Forgot password" and enter your email. You will receive a link to set a new password.',
  },
  {
    topic: 'Accounts & advisors',
    question: 'How do I contact my advisor?',
    answer:
      'Use Communicate in your dashboard to message your advisor directly. They can also be reached on the applications and equivalency requests they are reviewing for you.',
  },
];

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'how', 'what', 'when', 'where', 'who', 'can', 'does', 'do', 'my', 'you',
  'with', 'that', 'this', 'from', 'have', 'will', 'your', 'about', 'need', 'get', 'i', 'to', 'is', 'in',
  'of', 'a', 'an', 'it', 'on', 'me',
]);

const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));

const stem = (token: string) => token.replace(/(ing|ed|es|s)$/, '');

const rankFaqs = (query: string): Array<{ entry: FaqEntry; score: number }> => {
  const queryTokens = new Set(tokenize(query).map(stem));
  return FAQ_ENTRIES.map((entry) => {
    const entryTokens = new Set(tokenize(`${entry.topic} ${entry.question} ${entry.answer}`).map(stem));
    let score = 0;
    queryTokens.forEach((token) => {
      if (entryTokens.has(token)) score += 1;
    });
    return { entry, score };
  }).sort((left, right) => right.score - left.score);
};

const OUT_OF_SCOPE_REPLY =
  'I can help with applications and deadlines, visas and arrival, course equivalency and credit transfer, and accounts and advisors. Which of these is your question about?';

const TOPIC_SUGGESTIONS = ['How do I apply?', 'How does the visa process work?', 'How is credit transferred?', 'How do I contact my advisor?'];

/** Used when no LLM is configured or the LLM call fails: answer from the best-matching FAQ entry. */
export const answerFromFaq = (question: string): AssistantReply => {
  const [best, second] = rankFaqs(question);
  if (!best || best.score < 2) {
    return { answer: OUT_OF_SCOPE_REPLY, suggestions: TOPIC_SUGGESTIONS, answeredBy: 'faq' };
  }

  const related = second && second.score >= 2 ? [second.entry.question] : [];
  return { answer: best.entry.answer, suggestions: related, answeredBy: 'faq' };
};

const MAX_HISTORY_TURNS = 8;
const MAX_TEXT_LENGTH = 1000;

const buildPrompt = (history: AssistantTurn[], question: string) => `You are the Xchango help assistant for a university student-exchange platform. Students apply to partner universities, handle visas, get host courses matched to home courses for credit transfer, and talk to advisors.

Answer ONLY from the FAQ below. If the FAQ does not cover the question, say you are not sure and suggest messaging their advisor through Communicate. Never invent deadlines, fees, dates or policies.

If the question is too vague or could mean different things (for example "how long does it take?" without saying visa or application), do NOT guess: ask ONE short clarifying question and offer 2-3 options as suggestions.

Keep answers friendly and under 90 words.

FAQ:
${FAQ_ENTRIES.map((entry) => `[${entry.topic}] Q: ${entry.question}\nA: ${entry.answer}`).join('\n\n')}

CONVERSATION SO FAR:
${history.map((turn) => `${turn.role === 'user' ? 'Student' : 'Assistant'}: ${turn.text}`).join('\n') || '(none)'}

STUDENT'S NEW MESSAGE:
${question}

Return JSON in this exact format:
{
  "answer": "...",
  "suggestions": ["short follow-up or clarifying option", "..."]
}
Use at most 3 suggestions; use an empty array when none are useful.`;

export const askAssistant = async (question: string, history: AssistantTurn[] = []): Promise<AssistantReply> => {
  const trimmedQuestion = question.trim().slice(0, MAX_TEXT_LENGTH);
  const trimmedHistory = history
    .slice(-MAX_HISTORY_TURNS)
    .map((turn) => ({ role: turn.role, text: turn.text.trim().slice(0, MAX_TEXT_LENGTH) }));

  try {
    const parsed = await requestLlmJson<{ answer?: string; suggestions?: unknown }>(
      buildPrompt(trimmedHistory, trimmedQuestion)
    );
    if (parsed?.answer?.trim()) {
      const suggestions = Array.isArray(parsed.suggestions)
        ? parsed.suggestions.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).slice(0, 3)
        : [];
      return { answer: parsed.answer.trim(), suggestions, answeredBy: 'llm' };
    }
  } catch (error: any) {
    logger.warn('FAQ assistant LLM call failed; falling back to FAQ matching', { error: error.message });
  }

  return answerFromFaq(trimmedQuestion);
};
