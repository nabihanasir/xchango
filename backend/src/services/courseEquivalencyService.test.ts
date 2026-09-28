import mongoose from 'mongoose';
import Course from '../models/Course';
import CourseMatchResult, { MatchSource } from '../models/CourseMatchResult';
import CourseRequest, { AIMatchStatus } from '../models/CourseRequest';
import { evaluateCourseMatch, rankHomeCourseMatches } from './aiCourseMatcherService';
import { autoMatchRequestItems, updatePairedHomeCourse } from './courseEquivalencyService';

jest.mock('../models/Course');
jest.mock('../models/CourseMatchResult');
jest.mock('../models/CourseRequest', () => {
  const actual = jest.requireActual('../models/CourseRequest');
  return { ...actual, __esModule: true, default: { findById: jest.fn(), updateOne: jest.fn(), create: jest.fn() } };
});
jest.mock('../models/StudentProfile', () => ({ find: jest.fn(() => ({ lean: jest.fn().mockResolvedValue([]) })) }));
jest.mock('./notificationService', () => ({ appUrl: jest.fn(), notifyUser: jest.fn() }));
jest.mock('./aiCourseMatcherService', () => ({ evaluateCourseMatch: jest.fn(), rankHomeCourseMatches: jest.fn() }));
jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const MockedCourse = Course as jest.Mocked<typeof Course>;
const MockedMatchResult = CourseMatchResult as jest.Mocked<typeof CourseMatchResult>;
const MockedRequest = CourseRequest as unknown as { findById: jest.Mock; updateOne: jest.Mock };
const mockedRank = rankHomeCourseMatches as jest.Mock;
const mockedEvaluate = evaluateCourseMatch as jest.Mock;

const id = () => new mongoose.Types.ObjectId();
const requestId = id();
const itemId = id();
const hostCourse = { _id: id(), name: 'Host' };
const bestHome = { _id: id(), name: 'Best' };
const altHome = { _id: id(), name: 'Alternative' };
const reasoning = (summary: string) => ({
  overlappingTopics: [],
  missingTopics: [],
  additionalTopics: [],
  creditHourAssessment: 'ok',
  summary,
});

const buildRequest = (itemOverrides: Record<string, unknown> = {}) => {
  const item = {
    _id: itemId,
    hostCourseId: hostCourse._id,
    homeCourseId: null as unknown,
    aiMatchStatus: AIMatchStatus.IN_PROGRESS,
    ...itemOverrides,
  };
  const request = {
    _id: requestId,
    items: Object.assign([item], { id: (value: string) => (String(item._id) === String(value) ? item : null) }),
    save: jest.fn().mockResolvedValue(undefined),
    toObject: () => ({ _id: requestId, items: [{ ...item }] }),
  };
  return { request, item };
};

/** findById is used both directly (awaited) and chained with populate() when hydrating the response. */
const mockFindById = (request: unknown) => {
  MockedRequest.findById.mockImplementation(() => {
    const query = Promise.resolve(request) as Promise<unknown> & { populate: jest.Mock };
    query.populate = jest.fn(() => query);
    return query;
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  MockedMatchResult.find.mockReturnValue({
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue([]),
  } as never);
});

describe('autoMatchRequestItems', () => {
  it('pairs the best-ranked home course and stores every candidate', async () => {
    const { request } = buildRequest();
    mockFindById(request);
    MockedCourse.find.mockResolvedValue([bestHome, altHome] as never);
    MockedCourse.findById.mockResolvedValue(hostCourse as never);
    mockedRank.mockResolvedValue({
      matchedBy: MatchSource.LLM,
      candidates: [
        { homeCourse: bestHome, matchScore: 88, reasoning: reasoning('best') },
        { homeCourse: altHome, matchScore: 40, reasoning: reasoning('alt') },
      ],
    });
    MockedRequest.updateOne.mockResolvedValue({ matchedCount: 1 });

    await autoMatchRequestItems(String(requestId));

    expect(MockedRequest.updateOne).toHaveBeenCalledWith(
      { _id: String(requestId), items: { $elemMatch: { _id: String(itemId), aiMatchStatus: AIMatchStatus.IN_PROGRESS } } },
      {
        $set: {
          'items.$.homeCourseId': bestHome._id,
          'items.$.aiMatchStatus': AIMatchStatus.COMPLETED,
          'items.$.aiMatchError': null,
        },
      }
    );
    expect(MockedMatchResult.findOneAndUpdate).toHaveBeenCalledWith(
      { courseRequestItemId: itemId },
      expect.objectContaining({
        homeCourseId: bestHome._id,
        matchScore: 88,
        matchedBy: MatchSource.LLM,
        candidates: [
          expect.objectContaining({ homeCourseId: bestHome._id, matchScore: 88 }),
          expect.objectContaining({ homeCourseId: altHome._id, matchScore: 40 }),
        ],
      }),
      expect.anything()
    );
  });

  it('does not overwrite an item the advisor re-paired while matching ran', async () => {
    const { request } = buildRequest();
    mockFindById(request);
    MockedCourse.find.mockResolvedValue([bestHome] as never);
    MockedCourse.findById.mockResolvedValue(hostCourse as never);
    mockedRank.mockResolvedValue({
      matchedBy: MatchSource.LLM,
      candidates: [{ homeCourse: bestHome, matchScore: 88, reasoning: reasoning('best') }],
    });
    MockedRequest.updateOne.mockResolvedValue({ matchedCount: 0 });

    await autoMatchRequestItems(String(requestId));

    expect(MockedMatchResult.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('marks the item as failed when matching throws', async () => {
    const { request } = buildRequest();
    mockFindById(request);
    MockedCourse.find.mockResolvedValue([] as never);
    MockedCourse.findById.mockResolvedValue(hostCourse as never);
    mockedRank.mockRejectedValue(new Error('No home courses with outlines are available to match against.'));

    await autoMatchRequestItems(String(requestId));

    expect(MockedRequest.updateOne).toHaveBeenCalledWith(expect.anything(), {
      $set: {
        'items.$.aiMatchStatus': AIMatchStatus.FAILED,
        'items.$.aiMatchError': 'No home courses with outlines are available to match against.',
      },
    });
  });

  it('skips items that are not waiting for a match', async () => {
    const { request } = buildRequest({ aiMatchStatus: AIMatchStatus.COMPLETED });
    mockFindById(request);

    await autoMatchRequestItems(String(requestId));

    expect(mockedRank).not.toHaveBeenCalled();
  });
});

describe('updatePairedHomeCourse', () => {
  it('reuses the stored reasoning when the advisor picks an alternative candidate', async () => {
    const { request, item } = buildRequest({ homeCourseId: bestHome._id, aiMatchStatus: AIMatchStatus.COMPLETED });
    mockFindById(request);
    MockedCourse.findOne.mockResolvedValue(altHome as never);
    const existingResult = {
      homeCourseId: bestHome._id,
      matchScore: 88,
      reasoning: reasoning('best'),
      candidates: [
        { homeCourseId: bestHome._id, matchScore: 88, reasoning: reasoning('best') },
        { homeCourseId: altHome._id, matchScore: 40, reasoning: reasoning('alt') },
      ],
      save: jest.fn().mockResolvedValue(undefined),
    };
    MockedMatchResult.findOne.mockResolvedValue(existingResult as never);

    await updatePairedHomeCourse(String(requestId), String(itemId), String(altHome._id));

    expect(item.homeCourseId).toBe(altHome._id);
    expect(item.aiMatchStatus).toBe(AIMatchStatus.COMPLETED);
    expect(existingResult).toEqual(
      expect.objectContaining({ homeCourseId: altHome._id, matchScore: 40, reasoning: reasoning('alt') })
    );
    expect(existingResult.save).toHaveBeenCalled();
    expect(mockedEvaluate).not.toHaveBeenCalled();
  });

  it('scores a home course the matcher had not considered', async () => {
    const { request, item } = buildRequest({ homeCourseId: bestHome._id, aiMatchStatus: AIMatchStatus.COMPLETED });
    mockFindById(request);
    MockedCourse.findOne.mockResolvedValue(altHome as never);
    MockedCourse.findById.mockImplementation(((courseId: unknown) =>
      Promise.resolve(String(courseId) === String(hostCourse._id) ? hostCourse : altHome)) as never);
    MockedMatchResult.findOne.mockResolvedValue({
      candidates: [{ homeCourseId: bestHome._id, matchScore: 88, reasoning: reasoning('best') }],
    } as never);
    mockedEvaluate.mockResolvedValue({ matchScore: 55, reasoning: reasoning('manual'), matchedBy: MatchSource.LLM });

    await updatePairedHomeCourse(String(requestId), String(itemId), String(altHome._id));

    expect(mockedEvaluate).toHaveBeenCalledWith(hostCourse, altHome);
    expect(item.aiMatchStatus).toBe(AIMatchStatus.COMPLETED);
    expect(MockedMatchResult.findOneAndUpdate).toHaveBeenCalledWith(
      { courseRequestItemId: itemId },
      expect.objectContaining({
        homeCourseId: altHome._id,
        matchScore: 55,
        candidates: [
          expect.objectContaining({ homeCourseId: bestHome._id, matchScore: 88 }),
          expect.objectContaining({ homeCourseId: altHome._id, matchScore: 55 }),
        ],
      }),
      expect.anything()
    );
  });

  it('keeps the new pairing and records the error when scoring fails', async () => {
    const { request, item } = buildRequest({ homeCourseId: bestHome._id, aiMatchStatus: AIMatchStatus.COMPLETED });
    mockFindById(request);
    MockedCourse.findOne.mockResolvedValue(altHome as never);
    MockedCourse.findById.mockImplementation(((courseId: unknown) =>
      Promise.resolve(String(courseId) === String(hostCourse._id) ? hostCourse : altHome)) as never);
    MockedMatchResult.findOne.mockResolvedValue(null as never);
    mockedEvaluate.mockRejectedValue(new Error('Both host and home course outlines are required to run the AI match.'));

    await expect(updatePairedHomeCourse(String(requestId), String(itemId), String(altHome._id))).resolves.toBeDefined();

    expect(item.homeCourseId).toBe(altHome._id);
    expect(item.aiMatchStatus).toBe(AIMatchStatus.FAILED);
    expect(item).toEqual(expect.objectContaining({ aiMatchError: expect.stringContaining('outlines are required') }));
  });
});
