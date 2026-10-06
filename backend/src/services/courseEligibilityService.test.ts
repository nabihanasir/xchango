import { OutlineCategory } from '../models/ProgramOutline';
import {
  PlanContext,
  evaluateCandidate,
  evaluateCreditCaps,
  getCurrentSemester,
  isPlanCandidate,
  namesMatch,
  toFinalScore,
} from './courseEligibilityService';

const outline = (categoriesReviewed = true): NonNullable<PlanContext['outline']> => ({
  categoriesReviewed,
  semesters: [
    {
      semester: 3,
      declaredCredits: 18,
      courses: [
        { name: 'Data Structures', code: 'CS201', creditHours: 4, category: OutlineCategory.COMPUTING_CORE },
        { name: 'Multivariable Calculus', creditHours: 3, category: OutlineCategory.MATHEMATICS },
      ],
    },
    {
      semester: 4,
      declaredCredits: 18,
      courses: [
        { name: 'Database Systems', creditHours: 4, category: OutlineCategory.COMPUTING_CORE },
        { name: 'Human Computer Interaction', creditHours: 3, category: OutlineCategory.DOMAIN_ELECTIVE, slot: 'Domain Elective 1' },
      ],
    },
    {
      semester: 5,
      declaredCredits: 18,
      courses: [{ name: 'Operating Systems', creditHours: 3, category: OutlineCategory.COMPUTING_CORE }],
    },
  ],
});

const transcriptThrough = (lastSemester: number, extra: Array<{ courseName: string; grade: string }> = []): PlanContext['transcript'] => ({
  semesters: Array.from({ length: lastSemester }, (_, index) => ({
    semester: index + 1,
    courses: index + 1 === 3 ? [{ courseName: 'Data Structures', grade: 'B+' }, ...extra] : [],
  })),
});

const host = { name: 'Algorithms and Data Structures', creditHours: 4 };
const statusOf = (result: ReturnType<typeof evaluateCandidate>, key: string) =>
  result.checks.find((check) => check.key === key)?.status;

const labelOf = (result: ReturnType<typeof evaluateCandidate>, key: string) =>
  result.checks.find((check) => check.key === key)?.label;

describe('namesMatch', () => {
  it('matches loosely written course names', () => {
    expect(namesMatch('Data Structures', 'Data Structures & Algorithms')).toBe(true);
    expect(namesMatch('Database Systems', 'Database Systems (3+1)')).toBe(true);
  });

  it('keeps unrelated courses apart', () => {
    expect(namesMatch('Database Systems', 'Operating Systems')).toBe(false);
    expect(namesMatch('', 'Operating Systems')).toBe(false);
  });
});

describe('getCurrentSemester', () => {
  it('is the semester after the last one on the transcript', () => {
    expect(getCurrentSemester({ outline: outline(), transcript: transcriptThrough(3) })).toBe(4);
  });

  it('never goes past the plan', () => {
    expect(getCurrentSemester({ outline: outline(), transcript: transcriptThrough(9) })).toBe(5);
  });

  it('is unknown without a transcript', () => {
    expect(getCurrentSemester({ outline: outline(), transcript: null })).toBeNull();
  });
});

describe('evaluateCandidate', () => {
  const context: PlanContext = { outline: outline(), transcript: transcriptThrough(3) };

  it('passes a course planned for the current semester', () => {
    const result = evaluateCandidate(context, host, { name: 'Database Systems', creditHours: 4 });

    expect(result.eligible).toBe(true);
    expect(statusOf(result, 'plan')).toBe('pass');
    expect(statusOf(result, 'passed')).toBe('pass');
    expect(statusOf(result, 'category')).toBe('pass');
    expect(result.multiplier).toBe(1);
  });

  it('fails a course planned for a later semester', () => {
    const result = evaluateCandidate(context, host, { name: 'Operating Systems', creditHours: 3 });

    expect(statusOf(result, 'plan')).toBe('fail');
    expect(result.eligible).toBe(false);
  });

  it('fails a course the student already passed, found by name or code', () => {
    const byName = evaluateCandidate(context, host, { name: 'Data Structures', creditHours: 4 });
    const byCode = evaluateCandidate(context, host, { name: 'DS', code: 'cs 201', creditHours: 4 });

    expect(statusOf(byName, 'passed')).toBe('fail');
    expect(statusOf(byCode, 'plan')).toBe('warn');
  });

  it('does not count a failed grade as passed', () => {
    const failed: PlanContext = {
      outline: outline(),
      transcript: { semesters: [{ semester: 3, courses: [{ courseName: 'Data Structures', grade: 'F' }] }] },
    };
    const result = evaluateCandidate(failed, host, { name: 'Data Structures', creditHours: 4 });

    expect(statusOf(result, 'passed')).toBe('pass');
    expect(statusOf(result, 'plan')).toBe('warn');
  });

  it('warns when the host course has fewer credit hours', () => {
    const result = evaluateCandidate(context, { name: 'Databases', creditHours: 3 }, { name: 'Database Systems', creditHours: 4 });

    expect(statusOf(result, 'credits')).toBe('warn');
    expect(result.eligible).toBe(true);
  });

  it('lets an elective from a later semester fill a current elective slot', () => {
    const planned: PlanContext = {
      outline: {
        categoriesReviewed: true,
        semesters: [
          { semester: 4, declaredCredits: 6, courses: [{ name: 'Domain Elective Slot', creditHours: 3, category: OutlineCategory.DOMAIN_ELECTIVE }] },
          { semester: 5, declaredCredits: 6, courses: [{ name: 'Game Programming', creditHours: 3, category: OutlineCategory.DOMAIN_ELECTIVE }] },
        ],
      },
      transcript: transcriptThrough(3),
    };
    const result = evaluateCandidate(planned, host, { name: 'Game Programming', creditHours: 3 });

    expect(statusOf(result, 'plan')).toBe('warn');
    expect(statusOf(result, 'category')).toBe('pass');
  });

  it('fails an elective when the current semester has no elective slot', () => {
    const noSlot: PlanContext = {
      outline: {
        categoriesReviewed: true,
        semesters: [
          { semester: 4, declaredCredits: 3, courses: [{ name: 'Database Systems', creditHours: 3, category: OutlineCategory.COMPUTING_CORE }] },
          { semester: 5, declaredCredits: 3, courses: [{ name: 'Game Programming', creditHours: 3, category: OutlineCategory.DOMAIN_ELECTIVE }] },
        ],
      },
      transcript: transcriptThrough(3),
    };
    const result = evaluateCandidate(noSlot, host, { name: 'Game Programming', creditHours: 3 });

    expect(statusOf(result, 'plan')).toBe('fail');
    expect(statusOf(result, 'category')).toBe('fail');
  });

  it('warns while the advisor has not reviewed the categories', () => {
    const unreviewed: PlanContext = { outline: outline(false), transcript: transcriptThrough(3) };
    const result = evaluateCandidate(unreviewed, host, { name: 'Database Systems', creditHours: 4 });

    expect(statusOf(result, 'category')).toBe('warn');
  });

  it('reports every plan and transcript check as unknown when neither is uploaded', () => {
    const result = evaluateCandidate({ outline: null, transcript: null }, host, { name: 'Database Systems', creditHours: 4 });

    expect(statusOf(result, 'plan')).toBe('unknown');
    expect(statusOf(result, 'passed')).toBe('unknown');
    expect(statusOf(result, 'category')).toBe('unknown');
    expect(result.multiplier).toBe(1);
  });
});

describe('check labels', () => {
  const context: PlanContext = { outline: outline(), transcript: transcriptThrough(3) };

  it('name the finding, so a failed check never reads as its opposite', () => {
    const passedBefore = evaluateCandidate(context, host, { name: 'Data Structures', creditHours: 4 });
    const notTaken = evaluateCandidate(context, host, { name: 'Database Systems', creditHours: 4 });

    expect(labelOf(passedBefore, 'passed')).toBe('Already passed');
    expect(labelOf(notTaken, 'passed')).toBe('Not yet taken');
    expect(labelOf(evaluateCandidate(context, host, { name: 'Operating Systems', creditHours: 3 }), 'plan')).toBe(
      'Planned for a later semester'
    );
    expect(labelOf(notTaken, 'plan')).toBe('In current semester');
  });

  it('say whether the credit limit holds', () => {
    const { checks } = evaluateCreditCaps(context, [{ creditHours: 9 }, { creditHours: 6 }, { creditHours: 4 }]);

    expect(checks.map((check) => check.label)).toEqual(['Within credit limit', 'Within credit limit', 'Over credit limit']);
  });
});

describe('toFinalScore', () => {
  it('lowers the score by each concern', () => {
    const clean = { checks: [], eligible: true, multiplier: 1 };
    const failing = { checks: [], eligible: false, multiplier: 0.6 };

    expect(toFinalScore(80, clean)).toBe(80);
    expect(toFinalScore(80, failing)).toBe(48);
  });
});

describe('evaluateCreditCaps', () => {
  const context: PlanContext = { outline: outline(), transcript: transcriptThrough(3) };

  it('flags the courses that push the total over the semester limit', () => {
    const { summary, checks } = evaluateCreditCaps(context, [
      { creditHours: 9 },
      { creditHours: 6 },
      { creditHours: 4 },
    ]);

    expect(summary).toMatchObject({ currentSemester: 4, allowedCredits: 18, requestedCredits: 19, withinCap: false });
    expect(checks.map((check) => check.status)).toEqual(['pass', 'pass', 'fail']);
  });

  it('uses the sum of the plan when it states no total', () => {
    const noTotal: PlanContext = {
      outline: { categoriesReviewed: true, semesters: [{ semester: 2, declaredCredits: null, courses: [{ name: 'A', creditHours: 3, category: OutlineCategory.COMPUTING_CORE }, { name: 'B', creditHours: 4, category: OutlineCategory.COMPUTING_CORE }] }] },
      transcript: transcriptThrough(1),
    };

    expect(evaluateCreditCaps(noTotal, [{ creditHours: 3 }]).summary.allowedCredits).toBe(7);
  });

  it('cannot check the limit without an outline and a transcript', () => {
    const { summary, checks } = evaluateCreditCaps({ outline: null, transcript: null }, [{ creditHours: 3 }]);

    expect(summary.withinCap).toBeNull();
    expect(checks[0].status).toBe('unknown');
  });
});

describe('isPlanCandidate', () => {
  const context: PlanContext = { outline: outline(), transcript: transcriptThrough(3) };

  it('accepts unpassed courses planned for now or earlier, and rejects the rest', () => {
    expect(isPlanCandidate(context, { name: 'Database Systems', creditHours: 4 })).toBe(true);
    expect(isPlanCandidate(context, { name: 'Operating Systems', creditHours: 3 })).toBe(false);
    expect(isPlanCandidate(context, { name: 'Data Structures', creditHours: 4 })).toBe(false);
    expect(isPlanCandidate(context, { name: 'Unrelated Course', creditHours: 3 })).toBe(false);
  });
});
