import mongoose from 'mongoose';
import { ValidationError } from '../errors/AppError';

/** Patterns shared with the signup form so the browser and the server agree. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const NAME_PATTERN = /^[A-Za-z][A-Za-z .'-]*$/;
export const PHONE_PATTERN = /^\+?[0-9][0-9\s-]{6,17}$/;
export const SAP_ID_PATTERN = /^[0-9]{5,10}$/;
/** Letters, digits, dashes, dots and slashes: covers registration numbers such as 12345 or FA21-BCS-001. */
export const REGISTRATION_NUMBER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\-./ ]{2,29}$/;
export const COURSE_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\-_. ]{0,29}$/;
export const INTAKE_PATTERN = /^(spring|fall)\s+\d{4}$/i;
export const GRADE_PATTERN = /^(A\+?|A-|B\+?|B-|C\+?|C-|D\+?|D-|F|P|NP|W|I|[0-9]{1,3}(\.[0-9]{1,2})?%?)$/i;

export const MAX_PASSWORD_LENGTH = 128;
export const MAX_SHORT_TEXT = 200;
export const MAX_COMMENT_LENGTH = 1000;
export const MAX_DESCRIPTION_LENGTH = 5000;
export const MAX_PASTED_OUTLINE_LENGTH = 50000;

const fail = (message: string, reason: string, solution: string, code: string): never => {
  throw new ValidationError(message, reason, solution, code);
};

export const isValidEmail = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= 254 && EMAIL_PATTERN.test(value.trim());

/** Reads an optional/required string, trims it, and enforces a maximum length. */
export const readString = (
  value: unknown,
  label: string,
  options: { required?: boolean; max?: number; pattern?: RegExp; patternHint?: string; code?: string } = {}
): string => {
  const { required = false, max = MAX_SHORT_TEXT, pattern, patternHint, code } = options;
  const upper = label.toUpperCase().replace(/[^A-Z0-9]+/g, '_');

  if (value === undefined || value === null || value === '') {
    if (required) {
      fail(`${label} is required.`, `The ${label.toLowerCase()} field was empty.`, `Enter ${label.toLowerCase()} and try again.`, code || `${upper}_REQUIRED`);
    }
    return '';
  }

  if (typeof value !== 'string') {
    fail(`${label} must be text.`, `The ${label.toLowerCase()} value sent was not a string.`, `Enter ${label.toLowerCase()} as plain text.`, code || `${upper}_INVALID`);
  }

  const trimmed = (value as string).trim();
  if (!trimmed) {
    if (required) {
      fail(`${label} is required.`, `The ${label.toLowerCase()} field was empty.`, `Enter ${label.toLowerCase()} and try again.`, code || `${upper}_REQUIRED`);
    }
    return '';
  }

  if (trimmed.length > max) {
    fail(
      `${label} is too long.`,
      `${label} must be ${max} characters or fewer.`,
      `Shorten ${label.toLowerCase()} and try again.`,
      code || `${upper}_TOO_LONG`
    );
  }

  if (pattern && !pattern.test(trimmed)) {
    fail(
      `${label} is invalid.`,
      patternHint || `${label} is not in the expected format.`,
      `Check ${label.toLowerCase()} and try again.`,
      code || `${upper}_INVALID`
    );
  }

  return trimmed;
};

export const readEmail = (value: unknown, label = 'Email', required = true, code?: string): string => {
  const email = readString(value, label, { required, max: 254, code }).toLowerCase();
  if (email && !EMAIL_PATTERN.test(email)) {
    fail(`${label} is invalid.`, `${label} is not in a valid format.`, 'Enter an address like name@example.com.', code || 'EMAIL_INVALID');
  }
  return email;
};

export const readUrl = (value: unknown, label: string, required = false, code?: string): string => {
  const text = readString(value, label, { required, max: 2048, code });
  if (!text) return '';
  try {
    const parsed = new URL(text);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
      throw new Error('protocol');
    }
  } catch {
    fail(
      `${label} is invalid.`,
      `${label} is not a valid http(s) address.`,
      'Enter a full address such as https://www.example.edu.',
      code || `${label.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_INVALID`
    );
  }
  return text;
};

export const readPassword = (value: unknown, label = 'Password', code = 'PASSWORD_TOO_SHORT'): string => {
  if (typeof value !== 'string' || value.length < 8) {
    fail(`${label} is too short`, `${label} must be at least 8 characters long.`, 'Choose a stronger password with at least 8 characters.', code);
  }
  if ((value as string).length > MAX_PASSWORD_LENGTH) {
    fail(`${label} is too long`, `${label} must be ${MAX_PASSWORD_LENGTH} characters or fewer.`, 'Choose a shorter password.', 'PASSWORD_TOO_LONG');
  }
  if (!/[A-Za-z]/.test(value as string) || !/[0-9]/.test(value as string)) {
    fail(`${label} is too weak`, `${label} must contain both letters and numbers.`, 'Add at least one letter and one number.', 'PASSWORD_TOO_WEAK');
  }
  return value as string;
};

export const readNumber = (
  value: unknown,
  label: string,
  { min = 0, max = Number.MAX_SAFE_INTEGER, integer = false, required = true }: { min?: number; max?: number; integer?: boolean; required?: boolean } = {}
): number | null => {
  if (value === undefined || value === null || value === '') {
    if (required) {
      fail(`${label} is required.`, `The ${label.toLowerCase()} value was empty.`, `Enter ${label.toLowerCase()} as a number.`, `${label.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_REQUIRED`);
    }
    return null;
  }

  const numeric = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(numeric) || (integer && !Number.isInteger(numeric)) || numeric < min || numeric > max) {
    fail(
      `${label} is invalid.`,
      `${label} must be ${integer ? 'a whole number' : 'a number'} between ${min} and ${max}.`,
      `Enter a valid value for ${label.toLowerCase()}.`,
      `${label.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_INVALID`
    );
  }
  return numeric;
};

export const assertObjectId = (value: unknown, label: string, code = 'INVALID_ID'): string => {
  const id = typeof value === 'string' ? value.trim() : '';
  if (!id || !mongoose.Types.ObjectId.isValid(id) || String(new mongoose.Types.ObjectId(id)) !== id) {
    fail(`${label} is invalid.`, `The ${label.toLowerCase()} is not a valid identifier.`, 'Refresh the page and try again.', code);
  }
  return id;
};

export const assertOneOf = <T extends string>(value: unknown, allowed: readonly T[], label: string, code: string): T => {
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    fail(`${label} is invalid.`, `"${String(value)}" is not an allowed value.`, `Choose one of: ${allowed.join(', ')}.`, code);
  }
  return value as T;
};

export const readIsoDate = (value: unknown, label: string, required = true): Date | null => {
  if (value === undefined || value === null || value === '') {
    if (required) {
      fail(`${label} is required.`, `${label} was not provided.`, `Pick a ${label.toLowerCase()}.`, `${label.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_REQUIRED`);
    }
    return null;
  }
  const date = new Date(value as string | number | Date);
  if (Number.isNaN(date.getTime())) {
    fail(`${label} is invalid.`, `${label} is not a valid date.`, 'Pick a real date.', `${label.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_INVALID`);
  }
  return date;
};
