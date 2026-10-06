"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rankHomeCourseMatches = exports.prefilterHomeCourses = exports.evaluateCourseMatch = exports.MAX_LLM_CANDIDATES = void 0;
const CourseMatchResult_1 = require("../models/CourseMatchResult");
const similarity_1 = require("../utils/similarity");
const logger_1 = require("../utils/logger");
const adminService_1 = require("./adminService");
const BASIS_LABEL = {
    description: 'Catalogue description',
    outline: 'Course outline',
};
const BASIS_GUIDANCE = {
    description: 'The host course is described only by its short catalogue description, so it will list fewer topics than a full outline. Do not treat a topic as missing just because a short description leaves it out; judge whether the course is likely to cover it.',
    outline: 'The host course text is the full outline the student received at the host university.',
};
/** Home courses are compared on their outline, or their description when no outline is stored. */
const getHomeText = (course) => course.outlineText?.trim() || course.description?.trim() || '';
const toHostView = (hostCourse, { basis = 'description', uploadedOutline }) => {
    const text = basis === 'outline'
        ? uploadedOutline?.trim()
        : hostCourse.description?.trim() || hostCourse.outlineText?.trim();
    if (!text) {
        throw new Error(basis === 'outline'
            ? 'No uploaded outline is available for this host course.'
            : 'The host course has no description, so it cannot be matched automatically.');
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
exports.MAX_LLM_CANDIDATES = 5;
const STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'how', 'in', 'into', 'is', 'it',
    'of', 'on', 'or', 'that', 'the', 'their', 'this', 'to', 'using', 'with', 'will', 'students',
    'course', 'study', 'introduction', 'fundamentals', 'concepts', 'topics',
]);
const extractJsonObject = (content) => {
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
const tokenize = (text) => text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
const rankTopics = (text) => {
    const counts = tokenize(text).reduce((acc, token) => {
        acc[token] = (acc[token] || 0) + 1;
        return acc;
    }, {});
    return Object.entries(counts)
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .map(([topic]) => topic);
};
const sentenceCase = (value) => value.charAt(0).toUpperCase() + value.slice(1);
const buildPrompt = (hostCourse, homeCourse, basis) => `You are an academic course equivalency evaluator.

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
const buildHeuristicMatch = (hostCourse, homeCourse) => {
    const hostTopics = rankTopics(`${hostCourse.name} ${hostCourse.description || ''} ${hostCourse.outlineText || ''}`);
    const homeTopics = rankTopics(`${homeCourse.name} ${homeCourse.description || ''} ${homeCourse.outlineText || ''}`);
    const overlap = homeTopics.filter((topic) => hostTopics.includes(topic)).slice(0, 6).map(sentenceCase);
    const missing = homeTopics.filter((topic) => !hostTopics.includes(topic)).slice(0, 6).map(sentenceCase);
    const additional = hostTopics.filter((topic) => !homeTopics.includes(topic)).slice(0, 6).map(sentenceCase);
    const titleSimilarity = (0, similarity_1.calculateSimilarity)(hostCourse.name, homeCourse.name);
    const outlineSimilarity = (0, similarity_1.calculateSimilarity)(hostCourse.outlineText || '', getHomeText(homeCourse));
    const creditRatio = Math.min(hostCourse.creditHours, homeCourse.creditHours) / Math.max(hostCourse.creditHours, homeCourse.creditHours);
    const matchScore = Math.max(0, Math.min(100, Math.round((titleSimilarity * 25 + outlineSimilarity * 60 + creditRatio * 15) * 100)));
    let creditHourAssessment = 'Credit hours are closely aligned.';
    if (hostCourse.creditHours > homeCourse.creditHours) {
        creditHourAssessment = 'Host course carries more credit hours, which supports broader coverage.';
    }
    else if (hostCourse.creditHours < homeCourse.creditHours) {
        creditHourAssessment = 'Host course carries fewer credit hours, so coverage may be lighter than the home course.';
    }
    const summary = matchScore >= 80
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
const normalizeMatch = (parsed) => ({
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
const requestLlmJson = async (prompt) => {
    const dbConfig = await (0, adminService_1.getAiModelConfigRaw)();
    const useDbConfig = Boolean(dbConfig?.isEnabled && dbConfig.apiKey && dbConfig.baseUrl && dbConfig.modelName);
    const apiKey = useDbConfig ? dbConfig.apiKey : process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return null;
    }
    const baseUrl = useDbConfig ? dbConfig.baseUrl : (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1');
    const model = useDbConfig ? dbConfig.modelName : (process.env.OPENAI_MODEL || 'gpt-4.1-mini');
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
    const payload = await response.json();
    const rawContent = payload.choices?.[0]?.message?.content;
    if (!rawContent) {
        throw new Error('LLM response was empty.');
    }
    return JSON.parse(extractJsonObject(rawContent));
};
const callConfiguredLLM = async (hostCourse, homeCourse, basis) => {
    const parsed = await requestLlmJson(buildPrompt(hostCourse, homeCourse, basis));
    return parsed ? normalizeMatch(parsed) : null;
};
const evaluateCourseMatch = async (hostCourse, homeCourse, options = {}) => {
    const basis = options.basis || 'description';
    const host = toHostView(hostCourse, options);
    if (!getHomeText(homeCourse)) {
        throw new Error('The home course has no outline or description to compare against.');
    }
    const llmResult = await callConfiguredLLM(host, homeCourse, basis);
    if (llmResult) {
        return { ...llmResult, matchedBy: CourseMatchResult_1.MatchSource.LLM };
    }
    return { ...buildHeuristicMatch(host, homeCourse), matchedBy: CourseMatchResult_1.MatchSource.HEURISTIC };
};
exports.evaluateCourseMatch = evaluateCourseMatch;
const toTopicSet = (text) => new Set(tokenize(text));
const jaccard = (left, right) => {
    if (!left.size || !right.size) {
        return 0;
    }
    const overlap = [...left].filter((token) => right.has(token)).length;
    return overlap / (left.size + right.size - overlap);
};
/** Cheap keyword similarity used to shortlist home courses before asking the LLM. */
const prefilterHomeCourses = (hostCourse, homeCourses, limit = exports.MAX_LLM_CANDIDATES) => {
    const hostName = toTopicSet(hostCourse.name || hostCourse.title || '');
    const hostContent = toTopicSet(`${hostCourse.description || ''} ${hostCourse.outlineText || ''}`);
    return homeCourses
        .map((homeCourse) => ({
        homeCourse,
        score: jaccard(hostName, toTopicSet(homeCourse.name || homeCourse.title || '')) * 0.3 +
            jaccard(hostContent, toTopicSet(`${homeCourse.description || ''} ${homeCourse.outlineText || ''}`)) * 0.7,
    }))
        .sort((left, right) => right.score - left.score)
        .slice(0, limit)
        .map(({ homeCourse }) => homeCourse);
};
exports.prefilterHomeCourses = prefilterHomeCourses;
const buildRankingPrompt = (hostCourse, candidates, basis) => `You are an academic course equivalency evaluator.

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
    .map((candidate, index) => `[C${index + 1}]
Name: ${candidate.name}
Code: ${candidate.code}
Credit Hours: ${candidate.creditHours}
Outline: ${getHomeText(candidate)}`)
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
const rankWithLlm = async (hostCourse, candidates, basis) => {
    const parsed = await requestLlmJson(buildRankingPrompt(hostCourse, candidates, basis));
    if (!parsed) {
        return null;
    }
    const seen = new Set();
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
const rankHomeCourseMatches = async (hostCourse, homeCourses, options = {}) => {
    const basis = options.basis || 'description';
    const host = toHostView(hostCourse, options);
    const eligible = homeCourses.filter((homeCourse) => getHomeText(homeCourse));
    if (!eligible.length) {
        throw new Error('No home courses with outlines are available to match against.');
    }
    const shortlist = (0, exports.prefilterHomeCourses)(host, eligible);
    const byScore = (left, right) => right.matchScore - left.matchScore;
    try {
        const llmRanking = await rankWithLlm(host, shortlist, basis);
        if (llmRanking) {
            return { matchedBy: CourseMatchResult_1.MatchSource.LLM, candidates: llmRanking.sort(byScore) };
        }
    }
    catch (error) {
        logger_1.logger.warn('LLM course ranking failed; falling back to keyword matching', { error: error.message });
    }
    return {
        matchedBy: CourseMatchResult_1.MatchSource.HEURISTIC,
        candidates: shortlist
            .map((homeCourse) => ({ homeCourse, ...buildHeuristicMatch(host, homeCourse) }))
            .sort(byScore),
    };
};
exports.rankHomeCourseMatches = rankHomeCourseMatches;
