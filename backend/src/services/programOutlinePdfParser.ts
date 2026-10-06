import fs from 'fs/promises';
import { OutlineCategory } from '../models/ProgramOutline';

/** A piece of text with its position on the page (PDF units, origin at the bottom left). */
export interface PdfTextItem {
  text: string;
  x: number;
  y: number;
  width: number;
}

/** A filled rectangle on the page, with its fill colour as #rrggbb. */
export interface PdfShape {
  colour: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface PdfPageLayout {
  items: PdfTextItem[];
  shapes: PdfShape[];
}

/** The plan in the shape `normalizeProgramOutline` expects. */
export interface ParsedOutlineLayout {
  programName: string;
  semesters: Array<{
    semester: number;
    declaredCredits: number | null;
    courses: Array<{ name: string; code: string; creditHours: number; category: string; slot: string }>;
  }>;
}

interface Cell {
  shape: PdfShape;
  items: PdfTextItem[];
  text: string;
}

const MIN_CELL_SIZE = 8;
const MAX_CELL_WIDTH = 160;
const MAX_CELL_HEIGHT = 140;
const SAME_LINE_TOLERANCE = 2;
const WORD_GAP = 1;

/** Short lowercase words that really start a line, so they are not the tail of a word split across lines. */
const LINE_START_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'be', 'by', 'in', 'is', 'it', 'no', 'of', 'on', 'or', 'to']);

/** A lone capital followed by a closing bracket is the end of a word split inside brackets: "(Web Programming/AC" + "P)". */
const CLOSING_FRAGMENT = /^[A-Z]\)/;

const SEMESTER_HEADER = /^semester\s*(\d+)$/i;
const CREDIT_HEADER = /^(\d+)\s*credit\s*hrs?\.?$/i;
const COURSE_CREDITS = /\(\s*(\d+)(?:\s*\+\s*(\d+))?\s*\)\s*$/;
const DOMAIN_ELECTIVE = /^domain\s+elective\s*(\d+)\s*\((.*)\)$/i;
const ELECTIVE_SUPPORTING = /^elective\s+supporting/i;

/** Words in the table legend, in the order they are tried, and the category each names. */
const LEGEND_KEYWORDS: Array<[RegExp, OutlineCategory]> = [
  [/computing\s+core/i, OutlineCategory.COMPUTING_CORE],
  [/mathematics/i, OutlineCategory.MATHEMATICS],
  [/general\s+education/i, OutlineCategory.GENERAL_EDUCATION],
  [/elective\s+supporting/i, OutlineCategory.ELECTIVE_SUPPORTING],
  [/domain\s+core/i, OutlineCategory.DOMAIN_CORE],
  [/domain\s+elective/i, OutlineCategory.DOMAIN_ELECTIVE],
];

const isWhiteOrBlack = (colour: string) => colour === '#000000';

const area = (shape: PdfShape) => (shape.x1 - shape.x0) * (shape.y1 - shape.y0);

const contains = (shape: PdfShape, x: number, y: number) =>
  x >= shape.x0 && x <= shape.x1 && y >= shape.y0 && y <= shape.y1;

/** Joins the items of one cell into lines, top to bottom, and the lines into text. */
const toCellText = (items: PdfTextItem[]): string => {
  const sorted = [...items].sort((left, right) => right.y - left.y || left.x - right.x);

  const lines: PdfTextItem[][] = [];
  sorted.forEach((item) => {
    const line = lines.find((entry) => Math.abs(entry[0].y - item.y) <= SAME_LINE_TOLERANCE);
    if (line) {
      line.push(item);
    } else {
      lines.push([item]);
    }
  });

  const lineTexts = lines.map((line) => {
    const ordered = [...line].sort((left, right) => left.x - right.x);
    return ordered.reduce((text, item, index) => {
      if (index === 0) {
        return item.text.trim();
      }
      const previous = ordered[index - 1];
      const gap = item.x - (previous.x + previous.width);
      return `${text}${gap > WORD_GAP ? ' ' : ''}${item.text.trim()}`;
    }, '');
  });

  // The table wraps long words mid-word ("Programmin" / "g (3+1)"), so a line that opens with a short
  // lowercase fragment continues the previous word.
  return lineTexts
    .reduce((text, line) => {
      if (!text) {
        return line;
      }
      const opening = line.match(/^[a-z]+/)?.[0];
      const continuesWord =
        Boolean(opening && opening.length <= 2 && !LINE_START_WORDS.has(opening)) || CLOSING_FRAGMENT.test(line);
      return `${text}${continuesWord ? '' : ' '}${line}`;
    }, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/** Groups the page text by the filled cell it sits in, using the largest cell-sized rectangle around each item. */
const buildCells = ({ items, shapes }: PdfPageLayout): Cell[] => {
  const candidates = shapes.filter((shape) => {
    const width = shape.x1 - shape.x0;
    const height = shape.y1 - shape.y0;
    return !isWhiteOrBlack(shape.colour) && width >= MIN_CELL_SIZE && width <= MAX_CELL_WIDTH && height >= MIN_CELL_SIZE && height <= MAX_CELL_HEIGHT;
  });

  const groups = new Map<PdfShape, PdfTextItem[]>();
  items.forEach((item) => {
    const x = item.x + item.width / 2;
    const y = item.y + 3;
    const cell = candidates.filter((shape) => contains(shape, x, y)).sort((left, right) => area(right) - area(left))[0];
    if (cell) {
      groups.set(cell, [...(groups.get(cell) ?? []), item]);
    }
  });

  return [...groups.entries()].map(([shape, cellItems]) => ({ shape, items: cellItems, text: toCellText(cellItems) }));
};

const centreX = (shape: PdfShape) => (shape.x0 + shape.x1) / 2;

interface ParsedCourse {
  name: string;
  creditHours: number;
  slot: string;
  category: OutlineCategory | null;
}

/** Reads a course cell such as "Domain Elective 2 (Mobile Application Development) (3)". */
const parseCourseText = (text: string, electiveSupportingCount: number): ParsedCourse | null => {
  const credits = text.match(COURSE_CREDITS);
  if (!credits) {
    return null;
  }

  const creditHours = Number(credits[1]) + Number(credits[2] ?? 0);
  const rest = text.slice(0, credits.index).trim();

  const elective = rest.match(DOMAIN_ELECTIVE);
  if (elective) {
    return { name: elective[2].trim(), creditHours, slot: `Domain Elective ${elective[1]}`, category: OutlineCategory.DOMAIN_ELECTIVE };
  }

  if (ELECTIVE_SUPPORTING.test(rest)) {
    return {
      name: 'Elective Supporting Course',
      creditHours,
      slot: `Elective Supporting ${electiveSupportingCount}`,
      category: OutlineCategory.ELECTIVE_SUPPORTING,
    };
  }

  return rest ? { name: rest, creditHours, slot: '', category: null } : null;
};

/**
 * Reads a semester-wise plan from the positions and colours of one PDF page: one column per "Semester N"
 * header, one cell per course, the credit total under the header, and the colour legend for categories.
 * Returns null when the page has no such table.
 */
export const parseOutlineLayout = (page: PdfPageLayout): ParsedOutlineLayout | null => {
  const cells = buildCells(page);

  // The "Semester N" headers sit on a plain background, so they are found from the text, not from cells.
  const headers = page.items
    .map((item) => ({ item, match: item.text.trim().match(SEMESTER_HEADER) }))
    .filter((entry): entry is { item: PdfTextItem; match: RegExpMatchArray } => entry.match !== null)
    .map(({ item, match }) => ({ semester: Number(match[1]), x: item.x + item.width / 2, y: item.y }));
  if (headers.length < 2) {
    return null;
  }

  const headerY = Math.max(...headers.map((header) => header.y));
  const columnOf = (cell: Cell) =>
    headers.reduce((nearest, header) =>
      Math.abs(header.x - centreX(cell.shape)) < Math.abs(nearest.x - centreX(cell.shape)) ? header : nearest
    );

  const body = cells
    .filter((cell) => cell.shape.y1 <= headerY + SAME_LINE_TOLERANCE)
    .sort((left, right) => right.shape.y1 - left.shape.y1 || left.shape.x0 - right.shape.x0);

  const courseCells = body.filter((cell) => COURSE_CREDITS.test(cell.text) && !CREDIT_HEADER.test(cell.text));
  const gridBottom = Math.min(...courseCells.map((cell) => cell.shape.y0));

  // Colour -> category, from the legend cells below the grid (cells that name a category but have no credits in brackets).
  const legend = new Map<string, OutlineCategory>();
  body
    .filter((cell) => cell.shape.y1 <= gridBottom && !COURSE_CREDITS.test(cell.text))
    .forEach((cell) => {
      const keyword = LEGEND_KEYWORDS.find(([pattern]) => pattern.test(cell.text));
      if (keyword) {
        legend.set(cell.shape.colour, keyword[1]);
      }
    });

  const declared = new Map<number, number>();
  body.forEach((cell) => {
    const credit = cell.text.match(CREDIT_HEADER);
    const column = columnOf(cell);
    // The first credit cell under a header is the semester's total; later ones belong to the legend.
    if (credit && !declared.has(column.semester)) {
      declared.set(column.semester, Number(credit[1]));
    }
  });

  let electiveSupportingCount = 0;
  const semesters = new Map<number, ParsedOutlineLayout['semesters'][number]>();
  courseCells.forEach((cell) => {
    const course = parseCourseText(cell.text, electiveSupportingCount + 1);
    if (!course) {
      return;
    }
    if (course.category === OutlineCategory.ELECTIVE_SUPPORTING) {
      electiveSupportingCount += 1;
    }

    const { semester } = columnOf(cell);
    const entry = semesters.get(semester) ?? { semester, declaredCredits: declared.get(semester) ?? null, courses: [] };
    entry.courses.push({
      name: course.name,
      code: '',
      creditHours: course.creditHours,
      category: legend.get(cell.shape.colour) ?? course.category ?? OutlineCategory.UNKNOWN,
      slot: course.slot,
    });
    semesters.set(semester, entry);
  });

  if (!semesters.size) {
    return null;
  }

  // The program name is the line of text just above the semester headers ("BS Software Engineering").
  const aboveHeaders = page.items
    .filter((item) => item.y > headerY + SAME_LINE_TOLERANCE && item.y < headerY + 40 && item.text.trim())
    .sort((left, right) => left.y - right.y);
  const programName = aboveHeaders.length
    ? toCellText(aboveHeaders.filter((item) => Math.abs(item.y - aboveHeaders[0].y) <= SAME_LINE_TOLERANCE))
    : '';

  return { programName, semesters: [...semesters.values()].sort((left, right) => left.semester - right.semester) };
};

interface PdfjsModule {
  getDocument: (options: Record<string, unknown>) => { promise: Promise<any> };
  OPS: Record<string, number>;
}

let pdfjsPromise: Promise<PdfjsModule> | undefined;
// pdfjs ships as an ES module, so it has to be imported dynamically from this CommonJS build.
const loadPdfjs = () => (pdfjsPromise ??= import('pdfjs-dist/legacy/build/pdf.mjs') as unknown as Promise<PdfjsModule>);

type Matrix = [number, number, number, number, number, number];

const multiply = (left: Matrix, right: Matrix): Matrix => [
  left[0] * right[0] + left[2] * right[1],
  left[1] * right[0] + left[3] * right[1],
  left[0] * right[2] + left[2] * right[3],
  left[1] * right[2] + left[3] * right[3],
  left[0] * right[4] + left[2] * right[5] + left[4],
  left[1] * right[4] + left[3] * right[5] + left[5],
];

const apply = (matrix: Matrix, x: number, y: number): [number, number] => [
  matrix[0] * x + matrix[2] * y + matrix[4],
  matrix[1] * x + matrix[3] * y + matrix[5],
];

/** Collects the text and the filled rectangles of one page, in page coordinates. */
const readPage = async (pdfjs: PdfjsModule, page: any): Promise<PdfPageLayout> => {
  const { OPS } = pdfjs;
  const content = await page.getTextContent();
  const items: PdfTextItem[] = content.items
    .filter((item: any) => typeof item.str === 'string' && item.str.trim())
    .map((item: any) => ({ text: item.str, x: item.transform[4], y: item.transform[5], width: item.width }));

  const paint = new Set([OPS.fill, OPS.eoFill, OPS.fillStroke, OPS.eoFillStroke, OPS.closeFillStroke, OPS.closeEOFillStroke]);
  const fillColourOps = new Set([OPS.setFillRGBColor, OPS.setFillGray, OPS.setFillCMYKColor]);
  const list = await page.getOperatorList();

  const shapes: PdfShape[] = [];
  let colour = '#000000';
  let matrix: Matrix = [1, 0, 0, 1, 0, 0];
  const stack: Array<{ colour: string; matrix: Matrix }> = [];

  list.fnArray.forEach((fn: number, index: number) => {
    const args = list.argsArray[index];
    if (fn === OPS.save) {
      stack.push({ colour, matrix });
    } else if (fn === OPS.restore) {
      ({ colour, matrix } = stack.pop() ?? { colour, matrix });
    } else if (fn === OPS.transform) {
      matrix = multiply(matrix, args as Matrix);
    } else if (fillColourOps.has(fn) && typeof args?.[0] === 'string') {
      colour = args[0].toLowerCase();
    } else if (fn === OPS.constructPath && paint.has(args?.[0]) && args[2]) {
      const [minX, minY, maxX, maxY] = args[2] as number[];
      const [x0, y0] = apply(matrix, minX, minY);
      const [x1, y1] = apply(matrix, maxX, maxY);
      shapes.push({ colour, x0: Math.min(x0, x1), y0: Math.min(y0, y1), x1: Math.max(x0, x1), y1: Math.max(y0, y1) });
    }
  });

  return { items, shapes };
};

/** Reads the semester-wise plan from a PDF. Returns null when no page holds such a table. */
export const parseOutlinePdf = async (filePath: string): Promise<ParsedOutlineLayout | null> => {
  const pdfjs = await loadPdfjs();
  const document = await pdfjs.getDocument({
    data: new Uint8Array(await fs.readFile(filePath)),
    useSystemFonts: true,
    verbosity: 0,
  }).promise;

  try {
    const parsed: ParsedOutlineLayout[] = [];
    for (let number = 1; number <= document.numPages; number += 1) {
      const page = await document.getPage(number);
      const layout = parseOutlineLayout(await readPage(pdfjs, page));
      if (layout) {
        parsed.push(layout);
      }
    }

    if (!parsed.length) {
      return null;
    }

    // A plan can continue on the next page, so semesters from every page that has the table are merged.
    const semesters = new Map<number, ParsedOutlineLayout['semesters'][number]>();
    parsed.forEach((layout) =>
      layout.semesters.forEach((semester) => {
        const existing = semesters.get(semester.semester);
        semesters.set(
          semester.semester,
          existing ? { ...existing, courses: [...existing.courses, ...semester.courses] } : semester
        );
      })
    );

    return {
      programName: parsed.find((layout) => layout.programName)?.programName ?? '',
      semesters: [...semesters.values()].sort((left, right) => left.semester - right.semester),
    };
  } finally {
    await document.destroy();
  }
};
