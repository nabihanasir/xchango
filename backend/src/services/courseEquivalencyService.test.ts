import fs from 'fs/promises';
import mongoose from 'mongoose';
import Application from '../models/Application';
import Course from '../models/Course';
import CourseMatchResult, { MatchSource } from '../models/CourseMatchResult';
import CourseRequest, { AIMatchStatus } from '../models/CourseRequest';
import { evaluateCourseMatch, rankHomeCourseMatches } from './aiCourseMatcherService';
import { autoMatchRequestItems, updatePairedHomeCourse, uploadCourseOutline } from './courseEquivalencyService';
import { extractOutlineText } from './outlineTextService';

jest.mock('../models/Course');
jest.mock('../models/CourseMatchResult');
jest.mock('../models/CourseRequest', () => {
  const actual = jest.requireActual('../models/CourseRequest');
  return { ...actual, __esModule: true, default: { findById: jest.fn(), updateOne: jest.fn(), create: jest.fn() } };
});
jest.mock('../models/StudentProfile', () => ({ find: jest.fn(() => ({ lean: jest.fn().mockResolvedValue([]) })) }));
jest.mock('./notificationService', () => ({ appUrl: jest.fn(), notifyUser: jest.fn() }));
jest.mock('../models/Application', () => ({ __esModule: true, default: { exists: jest.fn() } }));
jest.mock('./outlineTextService', () => ({ extractOutlineText: jest.fn() }));
jest.mock('fs/promises', () => ({ __esModule: true, default: { unlink: jest.fn().mockResolvedValue(undefined) } }));
jest.mock('./aiCourseMatcherService', () => ({ evaluateCourseMatch: jest.fn(), rankHomeCourseMatches: jest.fn() }));
jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const MockedCourse = Course as jest.Mocked<typeof Course>;
const MockedMatchResult = CourseMatchResult as jest.Mocked<typeof CourseMatchResult>;
const MockedRequest = CourseRequest as unknown as { findById: jest.Mock; updateOne: jest.Mock };
const mockedRank = rankHomeCourseMatches as jest.Mock;
const mockedEvaluate = evaluateCourseMatch as jest.Mock;
const mockedApplicationExists = (Application as unknown as { exists: jest.Mock }).exists;
const mockedExtract = extractOutlineText as jest.Mock;
const mockedUnlink = fs.unlink as jest.Mock;
const flushBackgroundWork = () => new Promise((resolve) => setImmediate(resolve));

const id = () => new mongoose.Types.ObjectId();
const requestId = id();
const studentId = id();
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
    studentId,
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

    expect(mockedEvaluate).toHaveBeenCalledWith(hostCourse, altHome, { basis: 'description', uploadedOutline: undefined });
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

describe('outline-based matching', () => {
  const uploadedOutline = { text: 'Week 1 arrays...', uploadedAt: new Date() };
  const outlineRanking = {
    matchedBy: MatchSource.LLM,
    candidates: [{ homeCourse: altHome, matchScore: 92, reasoning: reasoning('outline best') }],
  };

  const runOutlineMatch = async (itemOverrides: Record<string, unknown>) => {
    const { request } = buildRequest({ uploadedOutline, outlineMatchStatus: AIMatchStatus.IN_PROGRESS, ...itemOverrides });
    mockFindById(request);
    MockedCourse.find.mockResolvedValue([bestHome, altHome] as never);
    MockedCourse.findById.mockResolvedValue(hostCourse as never);
    mockedRank.mockResolvedValue(outlineRanking);
    MockedRequest.updateOne.mockResolvedValue({ matchedCount: 1 });
    await autoMatchRequestItems(String(requestId), undefined, 'outline');
  };

  it('ranks from the uploaded outline, re-pairs, and sends a changed decision back for review', async () => {
    await runOutlineMatch({ homeCourseId: bestHome._id, status: 'approved', aiMatchStatus: AIMatchStatus.COMPLETED });

    expect(mockedRank).toHaveBeenCalledWith(hostCourse, [bestHome, altHome], {
      basis: 'outline',
      uploadedOutline: 'Week 1 arrays...',
    });
    expect(MockedRequest.updateOne).toHaveBeenCalledWith(
      { _id: String(requestId), items: { $elemMatch: { _id: String(itemId), outlineMatchStatus: AIMatchStatus.IN_PROGRESS } } },
      {
        $set: {
          'items.$.outlineMatchStatus': AIMatchStatus.COMPLETED,
          'items.$.outlineMatchError': null,
          'items.$.homeCourseId': altHome._id,
          'items.$.status': 'pending',
          'items.$.decidedAt': null,
          status: 'under_review',
        },
      }
    );
    expect(MockedMatchResult.findOneAndUpdate).toHaveBeenCalledWith(
      { courseRequestItemId: itemId },
      expect.objectContaining({
        outlineMatch: expect.objectContaining({ homeCourseId: altHome._id, matchScore: 92 }),
      }),
      expect.anything()
    );
    // The preliminary description match is left untouched.
    expect(MockedMatchResult.findOneAndUpdate.mock.calls[0][1]).not.toHaveProperty('matchScore');
  });

  it('keeps an approved decision when the outline confirms the same course', async () => {
    await runOutlineMatch({ homeCourseId: altHome._id, status: 'approved', aiMatchStatus: AIMatchStatus.COMPLETED });

    const [, update] = MockedRequest.updateOne.mock.calls[0];
    expect(update.$set).not.toHaveProperty(['items.$.status']);
  });

  it('does not let a description re-match replace the pairing from an uploaded outline', async () => {
    const { request } = buildRequest({ uploadedOutline, homeCourseId: altHome._id });
    mockFindById(request);
    MockedCourse.find.mockResolvedValue([bestHome, altHome] as never);
    MockedCourse.findById.mockResolvedValue(hostCourse as never);
    mockedRank.mockResolvedValue({
      matchedBy: MatchSource.LLM,
      candidates: [{ homeCourse: bestHome, matchScore: 70, reasoning: reasoning('desc') }],
    });
    MockedRequest.updateOne.mockResolvedValue({ matchedCount: 1 });

    await autoMatchRequestItems(String(requestId));

    const [, update] = MockedRequest.updateOne.mock.calls[0];
    expect(update.$set).not.toHaveProperty(['items.$.homeCourseId']);
  });
});

describe('uploadCourseOutline', () => {
  const file = { path: '/uploads/outlines/os.pdf', originalname: 'OS outline.pdf' } as Express.Multer.File;

  it('stores the extracted text and starts the outline match', async () => {
    const { request, item } = buildRequest({ aiMatchStatus: AIMatchStatus.COMPLETED });
    mockFindById(request);
    mockedApplicationExists.mockResolvedValue({ _id: 'application-1' });
    mockedExtract.mockResolvedValue('Extracted outline text');
    MockedCourse.find.mockResolvedValue([] as never);

    const result = await uploadCourseOutline(String(studentId), String(requestId), String(itemId), { file });
    await flushBackgroundWork();

    expect(mockedExtract).toHaveBeenCalledWith({ filePath: file.path, pastedText: undefined });
    expect(item).toEqual(
      expect.objectContaining({
        uploadedOutline: expect.objectContaining({ text: 'Extracted outline text', fileName: 'OS outline.pdf' }),
      })
    );
    expect(request.save).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ outlineUploadOpen: true }));
  });

  it('refuses uploads before arrival is recorded and deletes the file', async () => {
    const { request } = buildRequest();
    mockFindById(request);
    mockedApplicationExists.mockResolvedValue(null);

    await expect(
      uploadCourseOutline(String(studentId), String(requestId), String(itemId), { file })
    ).rejects.toThrow('once your arrival at the host university has been recorded');
    expect(mockedUnlink).toHaveBeenCalledWith(file.path);
    expect(request.save).not.toHaveBeenCalled();
  });

  it("refuses to upload to another student's request", async () => {
    const { request } = buildRequest();
    mockFindById(request);

    await expect(
      uploadCourseOutline(String(id()), String(requestId), String(itemId), { pastedText: 'x'.repeat(200) })
    ).rejects.toThrow('Course request not found.');
    expect(mockedApplicationExists).not.toHaveBeenCalled();
  });

  it('passes on the reason when no readable text could be extracted', async () => {
    const { request } = buildRequest();
    mockFindById(request);
    mockedApplicationExists.mockResolvedValue({ _id: 'application-1' });
    mockedExtract.mockRejectedValue(new Error('Could not read enough text from this file.'));

    await expect(
      uploadCourseOutline(String(studentId), String(requestId), String(itemId), { file })
    ).rejects.toThrow('Could not read enough text');
    expect(mockedUnlink).toHaveBeenCalledWith(file.path);
  });
});
