"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateCourseMatch = void 0;
const similarity_1 = require("../utils/similarity");
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
const buildPrompt = (hostCourse, homeCourse) => `You are an academic course equivalency evaluator.

Compare the following two course outlines and determine how well
the Host University course covers the material of the Home University course.

HOST UNIVERSITY COURSE:
Name: ${hostCourse.name}
Code: ${hostCourse.code}
Credit Hours: ${hostCourse.creditHours}
Outline: ${hostCourse.outlineText}

HOME UNIVERSITY COURSE:
Name: ${homeCourse.name}
Code: ${homeCourse.code}
Credit Hours: ${homeCourse.creditHours}
Outline: ${homeCourse.outlineText}

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
    const outlineSimilarity = (0, similarity_1.calculateSimilarity)(hostCourse.outlineText || '', homeCourse.outlineText || '');
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
const callConfiguredLLM = async (hostCourse, homeCourse) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return null;
    }
    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
    const prompt = buildPrompt(hostCourse, homeCourse);
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
    const parsed = JSON.parse(extractJsonObject(rawContent));
    return {
        matchScore: Math.max(0, Math.min(100, Math.round(parsed.matchScore))),
        reasoning: {
            overlappingTopics: parsed.reasoning?.overlappingTopics || [],
            missingTopics: parsed.reasoning?.missingTopics || [],
            additionalTopics: parsed.reasoning?.additionalTopics || [],
            creditHourAssessment: parsed.reasoning?.creditHourAssessment || '',
            summary: parsed.reasoning?.summary || '',
        },
    };
};
const evaluateCourseMatch = async (hostCourse, homeCourse) => {
    if (!hostCourse.outlineText?.trim() || !homeCourse.outlineText?.trim()) {
        throw new Error('Both host and home course outlines are required to run the AI match.');
    }
    const llmResult = await callConfiguredLLM(hostCourse, homeCourse);
    if (llmResult) {
        return llmResult;
    }
    return buildHeuristicMatch(hostCourse, homeCourse);
};
exports.evaluateCourseMatch = evaluateCourseMatch;
