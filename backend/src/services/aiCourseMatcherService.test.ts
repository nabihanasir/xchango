import { ICourse } from '../models/Course';
import { MatchSource } from '../models/CourseMatchResult';
import { getAiModelConfigRaw } from './adminService';
import { MAX_LLM_CANDIDATES, prefilterHomeCourses, rankHomeCourseMatches, requestLlmJson } from './aiCourseMatcherService';

jest.mock('./adminService', () => ({ getAiModelConfigRaw: jest.fn() }));
jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockedGetAiModelConfigRaw = getAiModelConfigRaw as jest.Mock;
const fetchMock = jest.fn();

const course = (id: string, name: string, outlineText: string, creditHours = 3) =>
  ({ _id: id, name, title: name, code: id.toUpperCase(), outlineText, description: '', creditHours }) as unknown as ICourse;

const host = course('host', 'Data Structures', 'Arrays linked lists stacks queues trees graphs hashing sorting algorithms');
const dataStructures = course('ds', 'Data Structures and Algorithms', 'Linked lists stacks queues binary trees graphs hashing sorting');
const calculus = course('calc', 'Calculus I', 'Limits derivatives integrals series differential equations');
const accounting = course('acc', 'Financial Accounting', 'Ledgers balance sheets income statements auditing');

const llmReply = (content: unknown) => ({
  ok: true,
  json: async () => ({ choices: [{ message: { content: JSON.stringify(content) } }] }),
});

const reasoning = (summary: string) => ({
  overlappingTopics: ['Trees'],
  missingTopics: [],
  additionalTopics: [],
  creditHourAssessment: 'Equal credit hours.',
  summary,
});

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = fetchMock as unknown as typeof fetch;
  delete process.env.OPENAI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.OLLAMA_MODEL;
  mockedGetAiModelConfigRaw.mockResolvedValue({
    isEnabled: true,
    apiKey: 'key',
    baseUrl: 'https://llm.example/v1',
    modelName: 'test-model',
  });
});

describe('prefilterHomeCourses', () => {
  it('ranks the course with the most similar outline first', () => {
    const shortlist = prefilterHomeCourses(host, [calculus, accounting, dataStructures]);
    expect(shortlist[0]).toBe(dataStructures);
  });

  it('keeps at most the configured number of candidates', () => {
    const many = Array.from({ length: 12 }, (_, index) => course(`c${index}`, `Course ${index}`, 'trees graphs'));
    expect(prefilterHomeCourses(host, many)).toHaveLength(MAX_LLM_CANDIDATES);
  });
});

describe('rankHomeCourseMatches', () => {
  it('uses the LLM scores to pick the best home course', async () => {
    fetchMock.mockResolvedValue(
      llmReply({
        candidates: [
          { id: 'C2', matchScore: 20, reasoning: reasoning('Weak') },
          { id: 'C1', matchScore: 91, reasoning: reasoning('Strong') },
        ],
      })
    );

    const ranking = await rankHomeCourseMatches(host, [calculus, dataStructures]);

    expect(ranking.matchedBy).toBe(MatchSource.LLM);
    expect(ranking.candidates[0].homeCourse).toBe(dataStructures);
    expect(ranking.candidates[0].matchScore).toBe(91);
    expect(ranking.candidates.map((candidate) => candidate.matchScore)).toEqual([91, 20]);
    const prompt = JSON.parse(fetchMock.mock.calls[0][1].body).messages[1].content as string;
    expect(prompt).toContain('[C1]\nName: Data Structures and Algorithms');
  });

  it('ignores unknown or duplicate candidate ids from the LLM', async () => {
    fetchMock.mockResolvedValue(
      llmReply({
        candidates: [
          { id: 'C1', matchScore: 80, reasoning: reasoning('First') },
          { id: 'C1', matchScore: 10, reasoning: reasoning('Duplicate') },
          { id: 'C9', matchScore: 99, reasoning: reasoning('Unknown') },
        ],
      })
    );

    const ranking = await rankHomeCourseMatches(host, [dataStructures]);

    expect(ranking.candidates).toHaveLength(1);
    expect(ranking.candidates[0].reasoning.summary).toBe('First');
  });

  it('falls back to keyword matching when no LLM is configured', async () => {
    mockedGetAiModelConfigRaw.mockResolvedValue(null);

    const ranking = await rankHomeCourseMatches(host, [calculus, dataStructures]);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(ranking.matchedBy).toBe(MatchSource.HEURISTIC);
    expect(ranking.candidates[0].homeCourse).toBe(dataStructures);
  });

  it('falls back to keyword matching when the LLM call fails', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => 'boom' });

    const ranking = await rankHomeCourseMatches(host, [calculus, dataStructures]);

    expect(ranking.matchedBy).toBe(MatchSource.HEURISTIC);
    expect(ranking.candidates[0].homeCourse).toBe(dataStructures);
  });

  it('skips home courses without an outline', async () => {
    mockedGetAiModelConfigRaw.mockResolvedValue(null);
    const noOutline = course('empty', 'Data Structures', '');

    const ranking = await rankHomeCourseMatches(host, [noOutline, calculus]);

    expect(ranking.candidates.map((candidate) => candidate.homeCourse)).toEqual([calculus]);
  });

  it('rejects a host course without a description', async () => {
    await expect(rankHomeCourseMatches(course('h', 'Empty', ''), [dataStructures])).rejects.toThrow(
      'The host course has no description'
    );
  });

  it('matches on the catalogue description by default and says so in the prompt', async () => {
    fetchMock.mockResolvedValue(llmReply({ candidates: [{ id: 'C1', matchScore: 60, reasoning: reasoning('ok') }] }));
    const described = { ...host, description: 'Short blurb about trees and graphs.' } as unknown as ICourse;

    await rankHomeCourseMatches(described, [dataStructures]);

    const prompt = JSON.parse(fetchMock.mock.calls[0][1].body).messages[1].content as string;
    expect(prompt).toContain('Catalogue description: Short blurb about trees and graphs.');
    expect(prompt).toContain('short catalogue description');
  });

  it('matches on the uploaded outline for the outline basis', async () => {
    fetchMock.mockResolvedValue(llmReply({ candidates: [{ id: 'C1', matchScore: 90, reasoning: reasoning('ok') }] }));

    await rankHomeCourseMatches(host, [dataStructures], {
      basis: 'outline',
      uploadedOutline: 'Week 1 arrays. Week 2 linked lists. Week 3 trees.',
    });

    const prompt = JSON.parse(fetchMock.mock.calls[0][1].body).messages[1].content as string;
    expect(prompt).toContain('Course outline: Week 1 arrays. Week 2 linked lists. Week 3 trees.');
    expect(prompt).not.toContain(host.outlineText as string);
  });

  it('requires uploaded text for the outline basis', async () => {
    await expect(rankHomeCourseMatches(host, [dataStructures], { basis: 'outline' })).rejects.toThrow(
      'No uploaded outline'
    );
  });

  it('rejects when no home course has an outline', async () => {
    await expect(rankHomeCourseMatches(host, [course('empty', 'Empty', ' ')])).rejects.toThrow(
      'No home courses with outlines'
    );
  });
});

describe('requestLlmJson provider fallback', () => {
  beforeEach(() => {
    mockedGetAiModelConfigRaw.mockResolvedValue(null);
    process.env.GEMINI_API_KEY = 'gemini-key';
    process.env.OPENROUTER_API_KEY = 'openrouter-key';
    process.env.OPENAI_API_KEY = 'openai-key';
  });

  it('uses the next provider when the first one fails', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 429, text: async () => 'rate limited' })
      .mockResolvedValueOnce(llmReply({ ok: true }));

    await expect(requestLlmJson('prompt')).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain('generativelanguage.googleapis.com');
    expect(fetchMock.mock.calls[1][0]).toContain('openrouter.ai');
  });

  it('throws the last error when every provider fails', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => 'boom' });

    await expect(requestLlmJson('prompt')).rejects.toThrow('LLM request failed: 500');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('returns null when no provider is configured', async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENAI_API_KEY;

    await expect(requestLlmJson('prompt')).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('requestLlmJson with a local Ollama model', () => {
  const ollamaReply = (content: unknown) => ({ ok: true, json: async () => ({ message: { content: JSON.stringify(content) } }) });

  beforeEach(() => {
    mockedGetAiModelConfigRaw.mockResolvedValue(null);
    process.env.GEMINI_API_KEY = 'gemini-key';
    process.env.OLLAMA_MODEL = 'gemma4:e4b-it-qat';
  });

  afterEach(() => {
    delete process.env.OLLAMA_MODEL;
    delete process.env.OLLAMA_BASE_URL;
    delete process.env.OLLAMA_NUM_CTX;
  });

  it('asks Ollama first for matching, with thinking off and a context window', async () => {
    fetchMock.mockResolvedValue(ollamaReply({ ok: true }));

    await expect(requestLlmJson('prompt', 'matching')).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:11434/api/chat');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      model: 'gemma4:e4b-it-qat',
      think: false,
      format: 'json',
      stream: false,
      options: { num_ctx: 8192 },
    });
  });

  it('falls back to the hosted models when Ollama is not running', async () => {
    fetchMock.mockRejectedValueOnce(new Error('fetch failed')).mockResolvedValueOnce(llmReply({ ok: true }));

    await expect(requestLlmJson('prompt', 'matching')).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toContain('generativelanguage.googleapis.com');
  });

  it('does not use Ollama for documents and chat', async () => {
    fetchMock.mockResolvedValue(llmReply({ ok: true }));

    await expect(requestLlmJson('prompt')).resolves.toEqual({ ok: true });

    expect(fetchMock.mock.calls[0][0]).toContain('generativelanguage.googleapis.com');
  });

  it('honours a custom base URL and context size', async () => {
    process.env.OLLAMA_BASE_URL = 'http://gpu-box:11434/';
    process.env.OLLAMA_NUM_CTX = '16384';
    fetchMock.mockResolvedValue(ollamaReply({ ok: true }));

    await requestLlmJson('prompt', 'matching');

    expect(fetchMock.mock.calls[0][0]).toBe('http://gpu-box:11434/api/chat');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).options.num_ctx).toBe(16384);
  });
});

describe('answers with the wrong shape', () => {
  beforeEach(() => {
    mockedGetAiModelConfigRaw.mockResolvedValue(null);
    process.env.GEMINI_API_KEY = 'gemini-key';
    process.env.OPENROUTER_API_KEY = 'openrouter-key';
  });

  it('tries the next provider when an answer does not match the expected shape', async () => {
    fetchMock
      .mockResolvedValueOnce(llmReply({ unexpected: 'shape' }))
      .mockResolvedValueOnce(llmReply({ ok: true }));

    await expect(requestLlmJson('prompt', 'general', (answer: { ok?: boolean }) => answer.ok === true)).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('ranks with the second provider when the first scores none of the candidates', async () => {
    fetchMock
      .mockResolvedValueOnce(llmReply({ matchScore: 70 }))
      .mockResolvedValueOnce(llmReply({ candidates: [{ id: 'C1', matchScore: 88, reasoning: reasoning('good') }] }));

    const ranking = await rankHomeCourseMatches(host, [dataStructures]);

    expect(ranking.matchedBy).toBe(MatchSource.LLM);
    expect(ranking.candidates[0].matchScore).toBe(88);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('Gemini request options', () => {
  beforeEach(() => {
    mockedGetAiModelConfigRaw.mockResolvedValue(null);
    process.env.GEMINI_API_KEY = 'gemini-key';
    fetchMock.mockResolvedValue(llmReply({ ok: true }));
  });

  afterEach(() => {
    delete process.env.GEMINI_REASONING_EFFORT;
  });

  it('switches thinking off by default so answers come back in seconds', async () => {
    await requestLlmJson('prompt');

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).reasoning_effort).toBe('none');
  });

  it('leaves thinking alone when asked to', async () => {
    process.env.GEMINI_REASONING_EFFORT = 'default';

    await requestLlmJson('prompt');

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty('reasoning_effort');
  });

  it('does not send the thinking option to other providers', async () => {
    delete process.env.GEMINI_API_KEY;
    process.env.OPENAI_API_KEY = 'openai-key';

    await requestLlmJson('prompt');

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty('reasoning_effort');
  });
});
