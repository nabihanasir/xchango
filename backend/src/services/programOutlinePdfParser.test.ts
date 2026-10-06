import { OutlineCategory } from '../models/ProgramOutline';
import { PdfPageLayout, PdfShape, PdfTextItem, parseOutlineLayout } from './programOutlinePdfParser';

const RED = '#ff0000';
const GREY = '#c0c0c0';
const GREEN = '#99cc00';
const PEACH = '#fabf8f';

const COLUMN_WIDTH = 100;
const columnX = (semester: number) => 20 + (semester - 1) * COLUMN_WIDTH;

/** A filled cell in a semester column, with its text lines written top to bottom inside it. */
const cell = (semester: number, top: number, height: number, colour: string, lines: string[]) => {
  const x0 = columnX(semester);
  const shape: PdfShape = { colour, x0, y0: top - height, x1: x0 + COLUMN_WIDTH - 4, y1: top };
  const items: PdfTextItem[] = lines.map((text, index) => ({ text, x: x0 + 4, y: top - 14 - index * 12, width: text.length * 5 }));
  return { shape, items };
};

const header = (semester: number): PdfTextItem => ({ text: `Semester ${semester}`, x: columnX(semester) + 10, y: 700, width: 50 });

const buildPage = (): PdfPageLayout => {
  const cells = [
    // The credit-hours row, then two course rows, for semesters 1 and 2.
    cell(1, 690, 24, PEACH, ['17 Credit Hrs.']),
    cell(2, 690, 24, PEACH, ['18 Credit', 'Hrs.']),
    cell(1, 660, 40, RED, ['Programmin', 'g Fundamentals (3+1)']),
    cell(2, 660, 40, RED, ['Object Oriented', 'Programming (3+1)']),
    cell(1, 610, 40, GREY, ['Functional English (3)']),
    cell(2, 610, 40, GREEN, ['Domain Elective 2', '(Mobile Application', 'Development) (3)']),
    cell(2, 560, 40, '#cc99ff', ['Elective', 'Supporting Courses (3)']),
    // The legend under the grid.
    cell(1, 300, 30, RED, ['Computing Core']),
    cell(2, 300, 30, GREY, ['General Education', 'Requirement']),
    cell(1, 260, 30, GREEN, ['Domain Elective']),
    cell(2, 260, 30, '#cc99ff', ['Elective Supporting Courses']),
    cell(1, 220, 30, RED, ['46 Credit Hrs.']),
  ];

  return {
    items: [
      { text: 'BS Software Engineering', x: 150, y: 725, width: 110 },
      header(1),
      header(2),
      ...cells.flatMap((entry) => entry.items),
    ],
    shapes: [{ colour: '#ffffff', x0: 0, y0: 0, x1: 595, y1: 842 }, ...cells.map((entry) => entry.shape)],
  };
};

describe('parseOutlineLayout', () => {
  it('reads semesters, credit totals, course names and credits from cell positions', () => {
    const parsed = parseOutlineLayout(buildPage());

    expect(parsed?.programName).toBe('BS Software Engineering');
    expect(parsed?.semesters.map((semester) => [semester.semester, semester.declaredCredits])).toEqual([
      [1, 17],
      [2, 18],
    ]);
    expect(parsed?.semesters[0].courses).toMatchObject([
      { name: 'Programming Fundamentals', creditHours: 4 },
      { name: 'Functional English', creditHours: 3 },
    ]);
  });

  it('takes categories from the colour legend, not from the course names', () => {
    const parsed = parseOutlineLayout(buildPage());
    const categories = Object.fromEntries(
      parsed!.semesters.flatMap((semester) => semester.courses.map((course) => [course.name, course.category]))
    );

    expect(categories['Programming Fundamentals']).toBe(OutlineCategory.COMPUTING_CORE);
    expect(categories['Functional English']).toBe(OutlineCategory.GENERAL_EDUCATION);
    expect(categories['Mobile Application Development']).toBe(OutlineCategory.DOMAIN_ELECTIVE);
  });

  it('names elective slots by their subject and keeps the slot label', () => {
    const parsed = parseOutlineLayout(buildPage());
    const courses = parsed!.semesters[1].courses;

    expect(courses).toContainEqual(
      expect.objectContaining({ name: 'Mobile Application Development', slot: 'Domain Elective 2', creditHours: 3 })
    );
    expect(courses).toContainEqual(
      expect.objectContaining({ name: 'Elective Supporting Course', slot: 'Elective Supporting 1', category: OutlineCategory.ELECTIVE_SUPPORTING })
    );
  });

  it('leaves the category unknown when the page has no legend for a colour', () => {
    const page = buildPage();
    const withoutLegend: PdfPageLayout = {
      items: page.items.filter((item) => item.y > 400),
      shapes: page.shapes.filter((shape) => shape.y0 > 400 || shape.colour === '#ffffff'),
    };
    const parsed = parseOutlineLayout(withoutLegend);

    expect(parsed?.semesters[0].courses[1].category).toBe(OutlineCategory.UNKNOWN);
    expect(parsed?.semesters[1].courses.find((course) => course.slot === 'Domain Elective 2')?.category).toBe(
      OutlineCategory.DOMAIN_ELECTIVE
    );
  });

  it('does not treat the legend credit totals as a semester total', () => {
    const parsed = parseOutlineLayout(buildPage());

    expect(parsed?.semesters[0].declaredCredits).toBe(17);
  });

  it('returns null for a page without a semester table', () => {
    expect(parseOutlineLayout({ items: [{ text: 'Introduction', x: 10, y: 700, width: 60 }], shapes: [] })).toBeNull();
  });
});
