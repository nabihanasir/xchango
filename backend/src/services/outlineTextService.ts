import fs from 'fs/promises';
import path from 'path';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

/** Outlines are sent to the LLM as-is, so very long files are cut to keep prompts a sensible size. */
export const MAX_OUTLINE_CHARS = 20000;
export const MIN_OUTLINE_CHARS = 100;

const cleanupWhitespace = (value: string) =>
  value
    .replace(/\r/g, '')
    .replace(/ /g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();

const readFileText = async (filePath: string): Promise<string> => {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === '.pdf') {
    const parser = new PDFParse({ data: await fs.readFile(filePath) });
    try {
      return (await parser.getText()).text;
    } finally {
      await parser.destroy();
    }
  }

  if (extension === '.docx') {
    return (await mammoth.extractRawText({ path: filePath })).value;
  }

  throw new Error('Only PDF and Word (.docx) outlines can be read.');
};

/**
 * Returns the outline text from an uploaded file or pasted text (the file wins when both are given).
 * Throws a message the student can act on when there is not enough readable text to match.
 */
export const extractOutlineText = async ({ filePath, pastedText }: { filePath?: string; pastedText?: string }) => {
  const text = cleanupWhitespace(filePath ? await readFileText(filePath) : pastedText || '');

  if (text.length < MIN_OUTLINE_CHARS) {
    throw new Error(
      filePath
        ? 'Could not read enough text from this file. If it is a scanned document, paste the outline text instead.'
        : `Paste the full course outline (at least ${MIN_OUTLINE_CHARS} characters).`
    );
  }

  return text.slice(0, MAX_OUTLINE_CHARS);
};
