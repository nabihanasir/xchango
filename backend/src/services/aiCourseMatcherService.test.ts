import { ICourse } from '../models/Course';
import { MatchSource } from '../models/CourseMatchResult';
import { getAiModelConfigRaw } from './adminService';
import { MAX_LLM_CANDIDATES, prefilterHomeCourses, rankHomeCourseMatches } from './aiCourseMatcherService';

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
