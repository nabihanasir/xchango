import mammoth from 'mammoth';
import { MAX_OUTLINE_CHARS, extractOutlineText } from './outlineTextService';

jest.mock('mammoth', () => ({ __esModule: true, default: { extractRawText: jest.fn() } }));
jest.mock('pdf-parse', () => ({
  PDFParse: jest.fn().mockImplementation(() => ({
    getText: jest.fn().mockResolvedValue({ text: 'Week 1:\tIntroduction   to operating systems\n\n\n\nWeek 2: Processes '.repeat(5) }),
    destroy: jest.fn().mockResolvedValue(undefined),
  })),
}));
jest.mock('fs/promises', () => ({ __esModule: true, default: { readFile: jest.fn().mockResolvedValue(Buffer.from('')) } }));

const mockedExtractRawText = mammoth.extractRawText as jest.Mock;

describe('extractOutlineText', () => {
  it('reads and tidies text from a PDF', async () => {
    const text = await extractOutlineText({ filePath: '/tmp/outline.pdf' });
    expect(text.startsWith('Week 1: Introduction to operating systems\n\nWeek 2: Processes')).toBe(true);
  });

  it('reads text from a Word document', async () => {
    mockedExtractRawText.mockResolvedValue({ value: 'Course outline '.repeat(20) });
    const text = await extractOutlineText({ filePath: '/tmp/outline.docx' });
    expect(mockedExtractRawText).toHaveBeenCalledWith({ path: '/tmp/outline.docx' });
    expect(text).toContain('Course outline');
  });

  it('accepts pasted text and caps very long outlines', async () => {
    const text = await extractOutlineText({ pastedText: 'a'.repeat(MAX_OUTLINE_CHARS + 500) });
    expect(text).toHaveLength(MAX_OUTLINE_CHARS);
  });

  it('asks for a paste when a file has almost no text, e.g. a scanned PDF', async () => {
    mockedExtractRawText.mockResolvedValue({ value: '  ' });
    await expect(extractOutlineText({ filePath: '/tmp/scan.docx' })).rejects.toThrow('paste the outline text instead');
  });

  it('rejects pasted text that is too short', async () => {
    await expect(extractOutlineText({ pastedText: 'Week 1' })).rejects.toThrow('at least 100 characters');
  });
});
