import { requestLlmJson } from './aiCourseMatcherService';
import { parseTranscriptFile } from './transcriptParser';
import { normalizeLlmTranscript, parseUploadedTranscript } from './transcriptLlmParser';

jest.mock('./aiCourseMatcherService', () => ({ requestLlmJson: jest.fn() }));
jest.mock('./transcriptParser', () => ({
  ...jest.requireActual('./transcriptParser'),
  parseTranscriptFile: jest.fn(),
  getRowsFromWorkbook: jest.fn().mockReturnValue([['Fall 2022'], ['Calculus I', 'A', '3'], ['Physics', 'B+', '4']]),
}));
jest.mock('pdf-parse', () => ({
  PDFParse: jest.fn().mockImplementation(() => ({
    getText: jest.fn().mockResolvedValue({ text: 'Fall 2022\nCalculus I A 3\nPhysics B+ 4\nCumulative GPA 3.6' }),
    destroy: jest.fn().mockResolvedValue(undefined),
  })),
}));
jest.mock('fs/promises', () => ({ __esModule: true, default: { readFile: jest.fn().mockResolvedValue(Buffer.from('')) } }));

const mockedRequestLlmJson = requestLlmJson as jest.Mock;
const mockedParseTranscriptFile = parseTranscriptFile as jest.Mock;

const llmTranscript = {
  cgpa: 3.6,
  semesters: [
    {
      semester: 1,
      sgpa: null,
      courses: [
        { courseName: 'Calculus I', grade: 'a', creditHours: 3 },
        { courseName: 'Physics', grade: 'B+', creditHours: '4' },
        { courseName: 'Seminar', grade: 'P', creditHours: 1 },
        { courseName: '', grade: 'A', creditHours: 3 },
      ],
    },
  ],
};

beforeEach(() => jest.clearAllMocks());

describe('normalizeLlmTranscript', () => {
  it('computes grade points itself and drops malformed or ungraded courses', () => {
    const transcript = normalizeLlmTranscript(llmTranscript);

    expect(transcript?.semesters[0].courses).toEqual([
      { courseName: 'Calculus I', grade: 'A', creditHours: 3, gradePoints: 4 },
      { courseName: 'Physics', grade: 'B+', creditHours: 4, gradePoints: 3.3 },
    ]);
    expect(transcript?.totalCredits).toBe(7);
    expect(transcript?.cgpa).toBe(3.6);
    expect(transcript?.semesters[0].sgpa).toBe(3.6);
  });

  it('falls back to a weighted CGPA when the LLM reports an implausible one', () => {
    const transcript = normalizeLlmTranscript({ ...llmTranscript, cgpa: 87 });
    expect(transcript?.cgpa).toBe(3.6);
  });

  it('returns null when nothing usable is found', () => {
    expect(normalizeLlmTranscript({ semesters: [] })).toBeNull();
    expect(normalizeLlmTranscript(null)).toBeNull();
    expect(normalizeLlmTranscript({ semesters: [{ semester: 1, courses: [{ courseName: 'X', grade: 'W', creditHours: 3 }] }] })).toBeNull();
  });
});

describe('parseUploadedTranscript', () => {
  it('uses the rule-based parser for spreadsheets and never calls the LLM when it works', async () => {
    const parsed = { fileUrl: '', cgpa: 3, totalCredits: 3, semesters: [] };
    mockedParseTranscriptFile.mockReturnValue(parsed);

    await expect(parseUploadedTranscript('/tmp/t.xlsx')).resolves.toBe(parsed);
    expect(mockedRequestLlmJson).not.toHaveBeenCalled();
  });

  it('falls back to the LLM when the rule-based parser finds nothing', async () => {
    mockedParseTranscriptFile.mockImplementation(() => {
      throw new Error('No transcript data could be parsed from the uploaded file.');
    });
    mockedRequestLlmJson.mockResolvedValue(llmTranscript);

    const transcript = await parseUploadedTranscript('/tmp/t.xlsx');
    expect(transcript.semesters[0].courses).toHaveLength(2);
  });

  it('keeps the original error for spreadsheets when no LLM is configured', async () => {
    mockedParseTranscriptFile.mockImplementation(() => {
      throw new Error('No transcript data could be parsed from the uploaded file.');
    });
    mockedRequestLlmJson.mockResolvedValue(null);

    await expect(parseUploadedTranscript('/tmp/t.xlsx')).rejects.toThrow('No transcript data could be parsed');
  });

  it('parses PDFs with the LLM', async () => {
    mockedRequestLlmJson.mockResolvedValue(llmTranscript);

    const transcript = await parseUploadedTranscript('/tmp/t.pdf');
    expect(mockedParseTranscriptFile).not.toHaveBeenCalled();
    expect(mockedRequestLlmJson.mock.calls[0][0]).toContain('Calculus I A 3');
    expect(transcript.totalCredits).toBe(7);
  });

  it('explains that PDFs need an AI model when none is configured', async () => {
    mockedRequestLlmJson.mockResolvedValue(null);
    await expect(parseUploadedTranscript('/tmp/t.pdf')).rejects.toThrow('need an AI model');
  });

  it('rejects a PDF the LLM cannot find courses in', async () => {
    mockedRequestLlmJson.mockResolvedValue({ semesters: [] });
    await expect(parseUploadedTranscript('/tmp/t.pdf')).rejects.toThrow('No transcript data could be parsed');
  });
});
