import { OutlineCategory } from '../models/ProgramOutline';
import { normalizeProgramOutline } from './programOutlineService';

describe('normalizeProgramOutline', () => {
  it('sums theory+lab credit values and reads the declared semester total', () => {
    const parsed = normalizeProgramOutline({
      programName: 'BS Software Engineering',
      semesters: [
        {
          semester: 1,
          declaredCredits: 7,
          courses: [
            { name: 'Programming Fundamentals', creditHours: '3+1', category: 'computing_core' },
            { name: 'Discrete Structures', creditHours: 3, category: 'mathematics_supporting' },
          ],
        },
      ],
    });

    expect(parsed?.semesters[0].courses.map((course) => course.creditHours)).toEqual([4, 3]);
    expect(parsed?.totalCredits).toBe(7);
    expect(parsed?.warnings).toEqual([]);
  });

  it('warns when the courses do not add up to the stated total', () => {
    const parsed = normalizeProgramOutline({
      semesters: [{ semester: 1, declaredCredits: 17, courses: [{ name: 'A', creditHours: 4, category: 'computing_core' }] }],
    });

    expect(parsed?.warnings[0]).toMatch(/Semester 1.*17.*4/);
  });

  it('falls back to uncategorised for unknown categories and says so', () => {
    const parsed = normalizeProgramOutline({
      semesters: [{ semester: 2, courses: [{ name: 'Mystery', creditHours: 3, category: 'colourful' }] }],
    });

    expect(parsed?.semesters[0].courses[0].category).toBe(OutlineCategory.UNKNOWN);
    expect(parsed?.warnings.some((warning) => /categorised/.test(warning))).toBe(true);
  });

  it('drops malformed courses and empty semesters, and orders semesters', () => {
    const parsed = normalizeProgramOutline({
      semesters: [
        { semester: 2, courses: [{ name: 'Kept', creditHours: 3, category: 'domain_core' }, { name: '', creditHours: 3 }, { name: 'No credits' }] },
        { semester: 1, courses: [] },
        { semester: 1, courses: [{ name: 'First', creditHours: 2, category: 'general_education' }] },
      ],
    });

    expect(parsed?.semesters.map((semester) => semester.semester)).toEqual([1, 2]);
    expect(parsed?.semesters[1].courses.map((course) => course.name)).toEqual(['Kept']);
  });

  it('returns null when there is no plan', () => {
    expect(normalizeProgramOutline({ semesters: [] })).toBeNull();
    expect(normalizeProgramOutline(null)).toBeNull();
  });
});
