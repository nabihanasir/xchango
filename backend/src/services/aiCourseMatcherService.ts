import { ICourse } from '../models/Course';
import { ICourseMatchReasoning, MatchSource } from '../models/CourseMatchResult';
import { calculateSimilarity } from '../utils/similarity';
import { logger } from '../utils/logger';
import { getAiModelConfigRaw } from './adminService';

export interface MatchResponse {
  matchScore: number;
  reasoning: ICourseMatchReasoning;
}

export interface RankedHomeCourse extends MatchResponse {
  homeCourse: ICourse;
}

export interface HomeCourseRanking {
  matchedBy: MatchSource;
  candidates: RankedHomeCourse[];
}

/**
 * Which host course text a match is based on: the short catalogue description (a preliminary match
 * before departure) or the real outline the student uploads at the host university (the final match).
 */
export type MatchBasis = 'description' | 'outline';

export interface MatchOptions {
  basis?: MatchBasis;
  /** Required for the outline basis: the text of the outline the student uploaded. */
  uploadedOutline?: string;
}

/** The course fields the matcher reads. `outlineText` carries whichever text the match is based on. */
type CourseText = Pick<ICourse, 'name' | 'code' | 'creditHours' | 'description' | 'outlineText'> & { title?: string };

const BASIS_LABEL: Record<MatchBasis, string> = {
  description: 'Catalogue description',
  outline: 'Course outline',
};

const BASIS_GUIDANCE: Record<MatchBasis, string> = {
  description:
    'The host course is described only by its short catalogue description, so it will list fewer topics than a full outline. Do not treat a topic as missing just because a short description leaves it out; judge whether the course is likely to cover it.',
  outline: 'The host course text is the full outline the student received at the host university.',
};

/** Home courses are compared on their outline, or their description when no outline is stored. */
const getHomeText = (course: CourseText) => course.outlineText?.trim() || course.description?.trim() || '';

const toHostView = (hostCourse: ICourse, { basis = 'description', uploadedOutline }: MatchOptions): CourseText => {
  const text =
    basis === 'outline'
      ? uploadedOutline?.trim()
      : hostCourse.description?.trim() || hostCourse.outlineText?.trim();

  if (!text) {
    throw new Error(
      basis === 'outline'
        ? 'No uploaded outline is available for this host course.'
        : 'The host course has no description, so it cannot be matched automatically.'
    );
  }

  return {
    name: hostCourse.name,
    title: hostCourse.title,
    code: hostCourse.code,
    creditHours: hostCourse.creditHours,
    description: '',
    outlineText: text,
  };
};

/** How many home courses survive the cheap pre-filter and are sent to the LLM. */
export const MAX_LLM_CANDIDATES = 5;

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'how', 'in', 'into', 'is', 'it',
  'of', 'on', 'or', 'that', 'the', 'their', 'this', 'to', 'using', 'with', 'will', 'students',
  'course', 'study', 'introduction', 'fundamentals', 'concepts', 'topics',
]);

const extractJsonObject = (content: string): string => {
  const trimmed = content.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed;
  }

  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('AI response did not contain valid JSON.');
  }

  return match[0];
};

const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));

const rankTopics = (text: string): string[] => {
  const counts = tokenize(text).reduce<Record<string, number>>((acc, token) => {
    acc[token] = (acc[token] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([topic]) => topic);
};

const sentenceCase = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

const buildPrompt = (hostCourse: CourseText, homeCourse: CourseText, basis: MatchBasis) => `You are an academic course equivalency evaluator.

Compare the following two courses and determine how well
the Host University course covers the material of the Home University course.
${BASIS_GUIDANCE[basis]}

HOST UNIVERSITY COURSE:
Name: ${hostCourse.name}
Code: ${hostCourse.code}
Credit Hours: ${hostCourse.creditHours}
${BASIS_LABEL[basis]}: ${hostCourse.outlineText}

HOME UNIVERSITY COURSE:
Name: ${homeCourse.name}
Code: ${homeCourse.code}
Credit Hours: ${homeCourse.creditHours}
Outline: ${getHomeText(homeCourse)}

Return a JSON response in this exact format:
{
  "matchScore": <integer 0-100>,
  "reasoning": {
    "overlappingTopics": ["..."],
    "missingTopics": ["..."],
    "additionalTopics": ["..."],
    "creditHourAssessment": "...",
    "summary": "..."
  }
}`;

const buildHeuristicMatch = (hostCourse: CourseText, homeCourse: CourseText): MatchResponse => {
  const hostTopics = rankTopics(`${hostCourse.name} ${hostCourse.description || ''} ${hostCourse.outlineText || ''}`);
  const homeTopics = rankTopics(`${homeCourse.name} ${homeCourse.description || ''} ${homeCourse.outlineText || ''}`);

  const overlap = homeTopics.filter((topic) => hostTopics.includes(topic)).slice(0, 6).map(sentenceCase);
  const missing = homeTopics.filter((topic) => !hostTopics.includes(topic)).slice(0, 6).map(sentenceCase);
  const additional = hostTopics.filter((topic) => !homeTopics.includes(topic)).slice(0, 6).map(sentenceCase);

  const titleSimilarity = calculateSimilarity(hostCourse.name, homeCourse.name);
  const outlineSimilarity = calculateSimilarity(hostCourse.outlineText || '', getHomeText(homeCourse));
  const creditRatio = Math.min(hostCourse.creditHours, homeCourse.creditHours) / Math.max(hostCourse.creditHours, homeCourse.creditHours);
  const matchScore = Math.max(
    0,
    Math.min(100, Math.round((titleSimilarity * 25 + outlineSimilarity * 60 + creditRatio * 15) * 100))
  );

  let creditHourAssessment = 'Credit hours are closely aligned.';
  if (hostCourse.creditHours > homeCourse.creditHours) {
    creditHourAssessment = 'Host course carries more credit hours, which supports broader coverage.';
  } else if (hostCourse.creditHours < homeCourse.creditHours) {
    creditHourAssessment = 'Host course carries fewer credit hours, so coverage may be lighter than the home course.';
  }

  const summary =
    matchScore >= 80
      ? 'Strong alignment across core topics with only limited content gaps.'
      : matchScore >= 50
        ? 'Moderate alignment with meaningful overlap, but the missing topics should be reviewed before approval.'
        : 'Low alignment. The host course does not appear to sufficiently cover the expected home-course outcomes.';

  return {
    matchScore,
    reasoning: {
      overlappingTopics: overlap.length ? overlap : ['No strong overlap identified'],
      missingTopics: missing.length ? missing : ['No critical missing topics detected'],
      additionalTopics: additional.length ? additional : ['No notable additional topics detected'],
      creditHourAssessment,
      summary,
    },
  };
};

const normalizeMatch = (parsed: Partial<MatchResponse> | undefined): MatchResponse => ({
  matchScore: Math.max(0, Math.min(100, Math.round(Number(parsed?.matchScore) || 0))),
  reasoning: {
    overlappingTopics: parsed?.reasoning?.overlappingTopics || [],
    missingTopics: parsed?.reasoning?.missingTopics || [],
    additionalTopics: parsed?.reasoning?.additionalTopics || [],
    creditHourAssessment: parsed?.reasoning?.creditHourAssessment || 'Not assessed.',
    summary: parsed?.reasoning?.summary || 'No summary provided.',
  },
});

/** Sends a prompt to the configured LLM and returns the parsed JSON, or null when no LLM is configured. */
const requestLlmJson = async <T>(prompt: string): Promise<T | null> => {
  const dbConfig = await getAiModelConfigRaw();
  const useDbConfig = Boolean(dbConfig?.isEnabled && dbConfig.apiKey && dbConfig.baseUrl && dbConfig.modelName);

  const apiKey = useDbConfig ? dbConfig!.apiKey : process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const baseUrl = useDbConfig ? dbConfig!.baseUrl : (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1');
  const model = useDbConfig ? dbConfig!.modelName : (process.env.OPENAI_MODEL || 'gpt-4.1-mini');

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`LLM request failed: ${response.status} ${errorBody}`);
  }

  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const rawContent = payload.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error('LLM response was empty.');
  }

  return JSON.parse(extractJsonObject(rawContent)) as T;
};

const callConfiguredLLM = async (
  hostCourse: CourseText,
  homeCourse: CourseText,
  basis: MatchBasis
): Promise<MatchResponse | null> => {
  const parsed = await requestLlmJson<MatchResponse>(buildPrompt(hostCourse, homeCourse, basis));
  return parsed ? normalizeMatch(parsed) : null;
};

export const evaluateCourseMatch = async (
  hostCourse: ICourse,
  homeCourse: ICourse,
  options: MatchOptions = {}
): Promise<MatchResponse & { matchedBy: MatchSource }> => {
  const basis = options.basis || 'description';
  const host = toHostView(hostCourse, options);
  if (!getHomeText(homeCourse)) {
    throw new Error('The home course has no outline or description to compare against.');
  }

  const llmResult = await callConfiguredLLM(host, homeCourse, basis);
  if (llmResult) {
    return { ...llmResult, matchedBy: MatchSource.LLM };
  }

  return { ...buildHeuristicMatch(host, homeCourse), matchedBy: MatchSource.HEURISTIC };
};

const toTopicSet = (text: string) => new Set(tokenize(text));

const jaccard = (left: Set<string>, right: Set<string>): number => {
  if (!left.size || !right.size) {
    return 0;
  }

  const overlap = [...left].filter((token) => right.has(token)).length;
  return overlap / (left.size + right.size - overlap);
};

/** Cheap keyword similarity used to shortlist home courses before asking the LLM. */
export const prefilterHomeCourses = (hostCourse: CourseText, homeCourses: ICourse[], limit = MAX_LLM_CANDIDATES): ICourse[] => {
  const hostName = toTopicSet(hostCourse.name || hostCourse.title || '');
  const hostContent = toTopicSet(`${hostCourse.description || ''} ${hostCourse.outlineText || ''}`);

  return homeCourses
    .map((homeCourse) => ({
      homeCourse,
      score:
        jaccard(hostName, toTopicSet(homeCourse.name || homeCourse.title || '')) * 0.3 +
        jaccard(hostContent, toTopicSet(`${homeCourse.description || ''} ${homeCourse.outlineText || ''}`)) * 0.7,
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ homeCourse }) => homeCourse);
};

const buildRankingPrompt = (hostCourse: CourseText, candidates: ICourse[], basis: MatchBasis) => `You are an academic course equivalency evaluator.

A student will take the HOST UNIVERSITY COURSE below while on exchange. Decide which of the
candidate HOME UNIVERSITY COURSES it can replace. For every candidate, judge how well the host
course covers the material of that home course outline.
${BASIS_GUIDANCE[basis]}

HOST UNIVERSITY COURSE:
Name: ${hostCourse.name}
Code: ${hostCourse.code}
Credit Hours: ${hostCourse.creditHours}
${BASIS_LABEL[basis]}: ${hostCourse.outlineText}

CANDIDATE HOME UNIVERSITY COURSES:
${candidates
  .map(
    (candidate, index) => `[C${index + 1}]
Name: ${candidate.name}
Code: ${candidate.code}
Credit Hours: ${candidate.creditHours}
Outline: ${getHomeText(candidate)}`
  )
  .join('\n\n')}

Return a JSON response in this exact format, with one entry per candidate:
{
  "candidates": [
    {
      "id": "C1",
      "matchScore": <integer 0-100>,
      "reasoning": {
        "overlappingTopics": ["..."],
        "missingTopics": ["..."],
        "additionalTopics": ["..."],
        "creditHourAssessment": "...",
        "summary": "..."
      }
    }
  ]
}`;

const rankWithLlm = async (
  hostCourse: CourseText,
  candidates: ICourse[],
  basis: MatchBasis
): Promise<RankedHomeCourse[] | null> => {
  const parsed = await requestLlmJson<{ candidates?: Array<Partial<MatchResponse> & { id?: string }> }>(
    buildRankingPrompt(hostCourse, candidates, basis)
  );
  if (!parsed) {
    return null;
  }

  const seen = new Set<number>();
  const ranked = (parsed.candidates || []).flatMap((entry) => {
    const index = Number(String(entry.id || '').replace(/\D/g, '')) - 1;
    if (!candidates[index] || seen.has(index)) {
      return [];
    }

    seen.add(index);
    return [{ homeCourse: candidates[index], ...normalizeMatch(entry) }];
  });

  if (!ranked.length) {
    throw new Error('LLM response did not score any of the candidate home courses.');
  }

  return ranked;
};

/**
 * Finds the home courses that best match the host course's catalogue description or uploaded outline.
 * Shortlists with keyword similarity, then asks the LLM to score the shortlist.
 * Falls back to the keyword heuristic when no LLM is configured or the LLM call fails.
 */
export const rankHomeCourseMatches = async (
  hostCourse: ICourse,
  homeCourses: ICourse[],
  options: MatchOptions = {}
): Promise<HomeCourseRanking> => {
  const basis = options.basis || 'description';
  const host = toHostView(hostCourse, options);

  const eligible = homeCourses.filter((homeCourse) => getHomeText(homeCourse));
  if (!eligible.length) {
    throw new Error('No home courses with outlines are available to match against.');
  }

  const shortlist = prefilterHomeCourses(host, eligible);
  const byScore = (left: RankedHomeCourse, right: RankedHomeCourse) => right.matchScore - left.matchScore;

  try {
    const llmRanking = await rankWithLlm(host, shortlist, basis);
    if (llmRanking) {
      return { matchedBy: MatchSource.LLM, candidates: llmRanking.sort(byScore) };
    }
  } catch (error: any) {
    logger.warn('LLM course ranking failed; falling back to keyword matching', { error: error.message });
  }

  return {
    matchedBy: MatchSource.HEURISTIC,
    candidates: shortlist
      .map((homeCourse) => ({ homeCourse, ...buildHeuristicMatch(host, homeCourse) }))
      .sort(byScore),
  };
};
