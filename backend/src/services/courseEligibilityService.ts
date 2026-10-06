import { ELECTIVE_CATEGORIES, IOutlineCourse, IOutlineSemester, OutlineCategory } from '../models/ProgramOutline';
import { calculateSimilarity } from '../utils/similarity';

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'unknown';
export type CheckKey = 'plan' | 'passed' | 'category' | 'credits' | 'creditCap';

export interface EligibilityCheck {
  key: CheckKey;
  label: string;
  status: CheckStatus;
  message: string;
}

/** The parts of a student's record the checks read, as plain data so they are easy to test. */
export interface PlanContext {
  outline: {
    categoriesReviewed: boolean;
    semesters: IOutlineSemester[];
  } | null;
  transcript: {
    semesters: Array<{ semester: number; courses: Array<{ courseName: string; grade: string }> }>;
  } | null;
}

export interface CourseLike {
  name?: string;
  title?: string;
  code?: string;
  creditHours: number;
}

export interface PlanSummary {
  outlineAvailable: boolean;
  transcriptAvailable: boolean;
  categoriesReviewed: boolean;
  currentSemester: number | null;
  /** Credit hours the program plan allows in the current semester. */
  allowedCredits: number | null;
  requestedCredits: number;
  withinCap: boolean | null;
}

export interface CandidateEligibility {
  checks: EligibilityCheck[];
  /** True when no check failed. */
  eligible: boolean;
  /** What the content score is multiplied by: each warning and failure lowers it. */
  multiplier: number;
}

export const CATEGORY_LABELS: Record<OutlineCategory, string> = {
  [OutlineCategory.COMPUTING_CORE]: 'Computing core',
  [OutlineCategory.MATHEMATICS]: 'Mathematics & supporting',
  [OutlineCategory.GENERAL_EDUCATION]: 'General education',
  [OutlineCategory.ELECTIVE_SUPPORTING]: 'Elective supporting',
  [OutlineCategory.DOMAIN_CORE]: 'Domain core',
  [OutlineCategory.DOMAIN_ELECTIVE]: 'Domain elective',
  [OutlineCategory.UNKNOWN]: 'Uncategorised',
};

const STATUS_MULTIPLIER: Record<CheckStatus, number> = { pass: 1, unknown: 1, warn: 0.9, fail: 0.6 };
const NAME_MATCH_THRESHOLD = 0.6;
const FAILING_GRADES = new Set(['F']);

const courseName = (course: CourseLike) => course.name || course.title || '';

const nameTokens = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

/** Course names rarely match exactly across a plan, a transcript and a catalogue, so compare them loosely. */
export const namesMatch = (left: string, right: string): boolean => {
  const leftTokens = nameTokens(left);
  const rightTokens = nameTokens(right);
  if (!leftTokens.length || !rightTokens.length) {
    return false;
  }

  if (calculateSimilarity(left, right) >= NAME_MATCH_THRESHOLD) {
    return true;
  }

  const [shorter, longer] = leftTokens.length <= rightTokens.length ? [leftTokens, rightTokens] : [rightTokens, leftTokens];
  return shorter.length >= 2 && shorter.every((token) => longer.includes(token));
};

const codesMatch = (left?: string, right?: string) =>
  Boolean(left && right && left.replace(/\s+/g, '').toLowerCase() === right.replace(/\s+/g, '').toLowerCase());

/** The semester the student is in: the one after their last transcript semester, never past the plan. */
export const getCurrentSemester = (context: PlanContext): number | null => {
  const taken = context.transcript?.semesters.map((semester) => semester.semester) ?? [];
  if (!taken.length) {
    return null;
  }

  const next = Math.max(...taken) + 1;
  const planned = context.outline?.semesters.map((semester) => semester.semester) ?? [];
  return planned.length ? Math.min(next, Math.max(...planned)) : next;
};

export const getSemesterPlan = (context: PlanContext, semester: number | null) =>
  semester === null ? undefined : context.outline?.semesters.find((entry) => entry.semester === semester);

export const getAllowedCredits = (plan: IOutlineSemester | undefined): number | null => {
  if (!plan) {
    return null;
  }

  return plan.declaredCredits ?? plan.courses.reduce((sum, course) => sum + course.creditHours, 0);
};

export interface OutlineEntry {
  semester: number;
  course: IOutlineCourse;
}

/** The plan entry a catalogue home course corresponds to, by course code first, then by name. */
export const findOutlineEntry = (context: PlanContext, homeCourse: CourseLike): OutlineEntry | null => {
  for (const semester of context.outline?.semesters ?? []) {
    for (const course of semester.courses) {
      if (codesMatch(course.code, homeCourse.code) || namesMatch(course.name, courseName(homeCourse))) {
        return { semester: semester.semester, course };
      }
    }
  }

  return null;
};

/** The grade the student passed the course with, or null when it is not on the transcript or was failed. */
export const findPassedGrade = (context: PlanContext, homeCourse: CourseLike): string | null => {
  for (const semester of context.transcript?.semesters ?? []) {
    for (const taken of semester.courses) {
      if (namesMatch(taken.courseName, courseName(homeCourse)) && !FAILING_GRADES.has(taken.grade.toUpperCase())) {
        return taken.grade;
      }
    }
  }

  return null;
};

const check = (key: CheckKey, label: string, status: CheckStatus, message: string): EligibilityCheck => ({
  key,
  label,
  status,
  message,
});

const hasCategorySlot = (context: PlanContext, semester: number, category: OutlineCategory) =>
  Boolean(getSemesterPlan(context, semester)?.courses.some((course) => course.category === category));

const planCheck = (context: PlanContext, entry: OutlineEntry | null, current: number | null): EligibilityCheck => {
  const label = 'Program plan';
  if (!context.outline) {
    return check('plan', label, 'unknown', 'The student has not uploaded a program outline.');
  }
  if (current === null) {
    return check('plan', label, 'unknown', 'The current semester is unknown because no transcript is uploaded.');
  }
  if (!entry) {
    return check('plan', 'Not in program plan', 'warn', 'This home course is not in the student’s program outline.');
  }
  if (entry.semester === current) {
    return check('plan', 'In current semester', 'pass', `Planned for semester ${current}, the student’s current semester.`);
  }
  if (entry.semester < current) {
    return check('plan', 'Earlier semester course', 'warn', `Planned for semester ${entry.semester}, so this would be a retake or backlog course.`);
  }

  // An elective planned for a later semester can still fill an elective slot of the same kind now.
  if (hasCategorySlot(context, current, entry.course.category) && ELECTIVE_CATEGORIES.includes(entry.course.category)) {
    return check(
      'plan',
      'Elective slot available',
      'warn',
      `Planned for semester ${entry.semester}, but semester ${current} has a ${CATEGORY_LABELS[entry.course.category].toLowerCase()} slot it could fill.`
    );
  }

  return check('plan', 'Planned for a later semester', 'fail', `Planned for semester ${entry.semester}; the student is in semester ${current}.`);
};

const passedCheck = (context: PlanContext, homeCourse: CourseLike): EligibilityCheck => {
  const label = 'Previous results';
  if (!context.transcript) {
    return check('passed', label, 'unknown', 'No transcript is uploaded, so earlier results could not be checked.');
  }

  const grade = findPassedGrade(context, homeCourse);
  return grade
    ? check('passed', 'Already passed', 'fail', `The student already passed this course with grade ${grade}.`)
    : check('passed', 'Not yet taken', 'pass', 'Not on the transcript with a passing grade.');
};

const categoryCheck = (
  context: PlanContext,
  entry: OutlineEntry | null,
  current: number | null
): EligibilityCheck => {
  const label = 'Course type';
  if (!context.outline) {
    return check('category', label, 'unknown', 'The student has not uploaded a program outline.');
  }
  if (!entry) {
    return check('category', label, 'unknown', 'The course type is unknown because the course is not in the outline.');
  }

  const { category } = entry.course;
  const categoryLabel = CATEGORY_LABELS[category];
  if (category === OutlineCategory.UNKNOWN || !context.outline.categoriesReviewed) {
    return check('category', label, 'warn', `${categoryLabel}: the advisor has not reviewed this student’s course types yet.`);
  }
  if (!ELECTIVE_CATEGORIES.includes(category)) {
    return check('category', label, 'pass', `${categoryLabel} course.`);
  }
  if (current === null) {
    return check('category', label, 'unknown', `${categoryLabel} course; the current semester is unknown.`);
  }

  return hasCategorySlot(context, current, category)
    ? check('category', label, 'pass', `${categoryLabel} course, and semester ${current} has a slot for it.`)
    : check('category', 'No elective slot', 'fail', `${categoryLabel} course, but semester ${current} has no such slot.`);
};

const creditsCheck = (hostCourse: CourseLike, homeCourse: CourseLike): EligibilityCheck => {
  const label = 'Credit hours';
  return hostCourse.creditHours >= homeCourse.creditHours
    ? check('credits', 'Credit hours covered', 'pass', `Host ${hostCourse.creditHours} credit hours cover the home course’s ${homeCourse.creditHours}.`)
    : check('credits', 'Fewer credit hours', 'warn', `Host course has ${hostCourse.creditHours} credit hours, the home course ${homeCourse.creditHours}.`);
};

/** Checks one home course against the student’s plan, transcript and the host course. */
export const evaluateCandidate = (
  context: PlanContext,
  hostCourse: CourseLike,
  homeCourse: CourseLike
): CandidateEligibility => {
  const current = getCurrentSemester(context);
  const entry = findOutlineEntry(context, homeCourse);
  const checks = [
    planCheck(context, entry, current),
    passedCheck(context, homeCourse),
    categoryCheck(context, entry, current),
    creditsCheck(hostCourse, homeCourse),
  ];

  return {
    checks,
    eligible: checks.every((entry) => entry.status !== 'fail'),
    multiplier: checks.reduce((product, entry) => product * STATUS_MULTIPLIER[entry.status], 1),
  };
};

/** The recommendation score: how well the courses match, lowered by every eligibility concern. */
export const toFinalScore = (contentScore: number, eligibility: CandidateEligibility) =>
  Math.max(0, Math.min(100, Math.round(contentScore * eligibility.multiplier)));

/**
 * Whether the requested courses fit the credit limit of the student's current semester.
 * Courses count in request order, so the ones that push the total over the limit are the ones flagged.
 */
export const evaluateCreditCaps = (
  context: PlanContext,
  hostCourses: CourseLike[]
): { summary: PlanSummary; checks: EligibilityCheck[] } => {
  const current = getCurrentSemester(context);
  const allowed = getAllowedCredits(getSemesterPlan(context, current));
  const label = 'Semester credit limit';

  let running = 0;
  const checks = hostCourses.map((course) => {
    running += course.creditHours;

    if (allowed === null) {
      return check(
        'creditCap',
        label,
        'unknown',
        context.outline
          ? 'The current semester is unknown because no transcript is uploaded.'
          : 'The student has not uploaded a program outline.'
      );
    }

    return running <= allowed
      ? check('creditCap', 'Within credit limit', 'pass', `${running} of ${allowed} credit hours allowed in semester ${current}.`)
      : check('creditCap', 'Over credit limit', 'fail', `Brings the total to ${running}, over the ${allowed} credit hours allowed in semester ${current}.`);
  });

  return {
    checks,
    summary: {
      outlineAvailable: Boolean(context.outline),
      transcriptAvailable: Boolean(context.transcript?.semesters.length),
      categoriesReviewed: Boolean(context.outline?.categoriesReviewed),
      currentSemester: current,
      allowedCredits: allowed,
      requestedCredits: running,
      withinCap: allowed === null ? null : running <= allowed,
    },
  };
};

/** Home courses that fit the student's plan: unpassed ones planned for the current or an earlier semester. */
export const isPlanCandidate = (context: PlanContext, homeCourse: CourseLike): boolean => {
  const current = getCurrentSemester(context);
  const entry = findOutlineEntry(context, homeCourse);
  return Boolean(entry && current !== null && entry.semester <= current && !findPassedGrade(context, homeCourse));
};
